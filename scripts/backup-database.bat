@echo off
REM ============================================
REM Automated Database Backup Script
REM Schedule this to run daily via Task Scheduler
REM ============================================

setlocal

REM Configuration
set PGPASSWORD=8810
set BACKUP_DIR=database\backups
set DB_NAME=zonerush
set DB_USER=postgres
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_backup_%TIMESTAMP%.sql

REM Replace spaces in time with zeros
set BACKUP_FILE=%BACKUP_FILE: =0%

echo ========================================
echo Starting Database Backup
echo ========================================
echo Timestamp: %TIMESTAMP%
echo Backup File: %BACKUP_FILE%
echo.

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Perform backup
echo Dumping database...
pg_dump -U %DB_USER% -d %DB_NAME% -F c -b -v -f "%BACKUP_FILE%" 2>> "%BACKUP_DIR%\backup_errors.log"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Backup completed successfully!
    echo ========================================
    echo Location: %BACKUP_FILE%
    
    REM Get file size
    for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
    echo Size: %SIZE% bytes
    
    REM Clean up old backups (keep last 7 days)
    echo.
    echo Cleaning up old backups (keeping last 7 days)...
    forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul
    echo Old backups cleaned.
    
    echo.
    echo Recent backups:
    dir "%BACKUP_DIR%\*.sql" /O-D /B | findstr /N "^" | findstr "^[1-5]:"
    
) else (
    echo.
    echo ========================================
    echo ERROR: Backup failed!
    echo ========================================
    echo Error code: %ERRORLEVEL%
    echo Check %BACKUP_DIR%\backup_errors.log for details
    exit /b %ERRORLEVEL%
)

endlocal
