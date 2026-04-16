@echo off
echo ============================================
echo Fixing Hardcoded Database Passwords in .bat Files
echo ============================================
echo.

cd /d "%~dp0"

REM Count files to fix
set COUNT=0

echo Scanning for .bat files with hardcoded PGPASSWORD...
echo.

REM List all .bat files with hardcoded passwords
for /r %%f in (*.bat) do (
    findstr /i /c:"set PGPASSWORD=8810" "%%f" >nul 2>&1
    if not errorlevel 1 (
        set /a COUNT+=1
        echo [!COUNT!] %%~fxf
    )
)

if %COUNT% equ 0 (
    echo ✅ No hardcoded passwords found!
    pause
    exit /b 0
)

echo.
echo Found %COUNT% files with hardcoded passwords.
echo.
echo 📋 Files will be updated to:
echo    1. Load credentials from scripts\.env or .env
echo    2. Use %%DB_PASSWORD%% instead of hardcoded value
echo    3. Show error if DB_PASSWORD not set
echo.
echo ⚠️  This will modify the following files:
echo.

for /r %%f in (*.bat) do (
    findstr /i /c:"set PGPASSWORD=8810" "%%f" >nul 2>&1
    if not errorlevel 1 (
        echo    - %%~fxf
    )
)

echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Fixing files...
echo.

set FIXED=0

REM Fix each file
for /r %%f in (*.bat) do (
    findstr /i /c:"set PGPASSWORD=8810" "%%f" >nul 2>&1
    if not errorlevel 1 (
        echo [FIXING] %%~fxf
        
        REM Create backup
        copy "%%f" "%%f.bak" >nul
        
        REM Replace hardcoded password with .env loader
        powershell -Command "(Get-Content '%%f') -replace 'set PGPASSWORD=8810', \"REM Load from .env`nif exist `\"scripts\\.env`\" (`n    for /f `\"tokens=1,2 delims==`\" %%%%a in (scripts\\.env) do (`n        set %%%%a=%%%%b`n    )`n)`nif exist \".env\" (`n    for /f `\"tokens=1,2 delims==`\" %%%%a in (.env) do (`n        set %%%%a=%%%%b`n    )`n)`nif not defined DB_PASSWORD (`n    echo ERROR: DB_PASSWORD not set! Create scripts\\.env`n    pause`n    exit /b 1`n)`nset PGPASSWORD=%%DB_PASSWORD%%\" | Set-Content '%%f'"
        
        set /a FIXED+=1
        echo [OK] %%~fxf
        echo.
    )
)

echo.
echo ============================================
echo Fix Complete!
echo ============================================
echo.
echo ✅ Fixed %FIXED% files
echo 📁 Backups created: *.bak files
echo.
echo Next steps:
echo 1. Create scripts\.env from scripts\.env.example
echo 2. Set DB_PASSWORD=your_database_password
echo 3. Test: test-db-connection.bat
echo 4. Delete .bak files after verification
echo.

pause
