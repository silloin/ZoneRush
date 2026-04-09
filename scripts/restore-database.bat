@echo off
REM ============================================
REM Database Restore Script
REM Usage: restore-database.bat [backup_file]
REM ============================================

setlocal

if "%1"=="" (
    echo Error: Please specify backup file to restore
    echo Usage: restore-database.bat database\backups\zonerush_backup_20260405.sql
    exit /b 1
)

set PGPASSWORD=8810
set BACKUP_FILE=%1
set DB_NAME=zonerush
set DB_USER=postgres

echo ========================================
echo WARNING: This will OVERWRITE the current database!
echo ========================================
echo.
echo Backup file: %BACKUP_FILE%
echo Database: %DB_NAME%
echo.

if not exist "%BACKUP_FILE%" (
    echo ERROR: Backup file not found: %BACKUP_FILE%
    exit /b 1
)

set /p CONFIRM="Are you sure you want to continue? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Restore cancelled.
    exit /b 0
)

echo.
echo Dropping existing database...
dropdb -U %DB_USER% %DB_NAME% 2>nul

echo Creating fresh database...
createdb -U %DB_USER% %DB_NAME%

echo Restoring from backup...
pg_restore -U %DB_USER% -d %DB_NAME% -v "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Restore completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERROR: Restore failed!
    echo ========================================
    echo Error code: %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

endlocal
