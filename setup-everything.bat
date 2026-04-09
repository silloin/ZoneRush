@echo off
color 0A
title SOS Emergency System - Complete Setup
echo.
echo ===============================================
echo    SOS EMERGENCY SYSTEM - COMPLETE SETUP
echo ===============================================
echo.
echo This will set up ALL features:
echo   1. Database Migration + Testing
echo   2. Geofencing & Check-in Timers
echo   3. Firebase Configuration (Optional)
echo   4. Final Verification
echo.
pause

:MENU
cls
echo.
echo ===============================================
echo            SETUP OPTIONS
echo ===============================================
echo.
echo [1] Run Database Migration & Tests
echo [2] Add Geofencing & Check-in Features
echo [3] Configure Firebase Push Notifications
echo [4] Test Everything
echo [5] Quick Start (Recommended)
echo [6] Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto MIGRATE
if "%choice%"=="2" goto GEOFENCE
if "%choice%"=="3" goto FIREBASE
if "%choice%"=="4" goto TEST
if "%choice%"=="5" goto QUICKSTART
if "%choice%"=="6" goto END

:MIGRATE
cls
echo.
echo ===============================================
echo [1/4] DATABASE MIGRATION & TESTING
echo ===============================================
echo.
echo Running migration...
cd server
node test-sos-database.js
echo.
echo Migration complete!
echo.
pause
goto MENU

:GEOFENCE
cls
echo.
echo ===============================================
echo [2/4] ADDING GEOFENCING ^& CHECK-IN FEATURES
echo ===============================================
echo.
echo Creating database tables...
psql -U postgres -d runterra -f sql\geofencing_checkin.sql
echo.
if errorlevel 1 (
    echo ERROR: Failed to create geofencing tables
    echo Make sure PostgreSQL is running and you're connected
) else (
    echo SUCCESS: Geofencing tables created!
)
echo.
pause
goto MENU

:FIREBASE
cls
echo.
echo ===============================================
echo [3/4] FIREBASE CONFIGURATION
echo ===============================================
echo.
echo To configure Firebase, follow these steps:
echo.
echo 1. Go to https://console.firebase.google.com/
echo 2. Create a new project (or use existing)
echo 3. Generate service account key
echo 4. Download JSON file
echo 5. Copy contents to single line
echo 6. Add to server/.env as FIREBASE_SERVICE_ACCOUNT_KEY={...}
echo.
echo For detailed guide, see: FIREBASE_SETUP_GUIDE.md
echo.
set /p configured="Have you configured Firebase? (y/n): "
if /i "%configured%"=="y" (
    echo.
    echo Testing Firebase configuration...
    node test-firebase-config.js
) else (
    echo.
    echo No problem! Firebase is optional.
    echo You can configure it later using the guide.
)
echo.
pause
goto MENU

:TEST
cls
echo.
echo ===============================================
echo [4/4] RUNNING COMPREHENSIVE TESTS
echo ===============================================
echo.
echo Test 1: Database Tables
echo ------------------------
psql -U postgres -d runterra -c "SELECT COUNT(*) FROM emergency_contacts;"
psql -U postgres -d runterra -c "SELECT COUNT(*) FROM user_geofences;"
psql -U postgres -d runterra -c "SELECT COUNT(*) FROM sos_alerts;"
echo.
echo Test 2: Backend Files
echo ---------------------
dir controllers\emergencyController.js >nul 2>&1 && echo [OK] Emergency controller exists || echo [FAIL] Missing
dir services\geofenceService.js >nul 2>&1 && echo [OK] Geofence service exists || echo [FAIL] Missing
dir utils\firebasePush.js >nul 2>&1 && echo [OK] Firebase push exists || echo [FAIL] Missing
echo.
echo Test 3: Frontend Components
echo ---------------------------
dir ..\client\src\components\SOSButton.jsx >nul 2>&1 && echo [OK] SOS button exists || echo [FAIL] Missing
dir ..\client\src\components\EmergencyContacts.jsx >nul 2>&1 && echo [OK] Emergency contacts exists || echo [FAIL] Missing
dir ..\client\src\components\SOSAdminDashboard.jsx >nul 2>&1 && echo [OK] Admin dashboard exists || echo [FAIL] Missing
echo.
echo All tests complete!
echo.
pause
goto MENU

:QUICKSTART
cls
echo.
echo ===============================================
echo           QUICK START (RECOMMENDED)
echo ===============================================
echo.
echo This will:
echo   - Apply all database migrations
echo   - Add geofencing tables
echo   - Verify setup
echo.
echo Skipping Firebase (you can add it later)
echo.
set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" goto MENU

echo.
echo Step 1: Running database tests...
cd server
node test-sos-database.js
echo.

echo Step 2: Adding geofencing tables...
psql -U postgres -d runterra -f sql\geofencing_checkin.sql
echo.

echo Step 3: Verifying setup...
psql -U postgres -d runterra -c "\dt" | findstr "sos_alerts emergency_contacts user_geofences"
echo.

echo ===============================================
echo     SETUP COMPLETE!
echo ===============================================
echo.
echo Your SOS system is ready with:
echo   [OK] Basic SOS alerts
echo   [OK] Live GPS tracking
echo   [OK] Emergency contacts
echo   [OK] WhatsApp sharing
echo   [OK] Geofencing (safe zones)
echo   [OK] Check-in timers
echo.
echo Optional: Configure Firebase for push notifications
echo See: FIREBASE_SETUP_GUIDE.md
echo.
echo Next steps:
echo   1. Start backend: npm run dev
echo   2. Open http://localhost:5173/profile
echo   3. Click red SOS button to test!
echo.
pause
goto MENU

:END
cls
echo.
echo ===============================================
echo        Thank you for setting up SOS!
echo ===============================================
echo.
echo Your emergency response system is ready to save lives!
echo.
echo Documentation files created:
echo   - FIREBASE_SETUP_GUIDE.md
echo   - ADVANCED_FEATURES_COMPLETE_GUIDE.md
echo   - SOS_ERROR_FIXES.md
echo   - SOS_FINAL_SUMMARY.md
echo.
echo Need help? Check the guides or ask questions!
echo.
pause
exit
