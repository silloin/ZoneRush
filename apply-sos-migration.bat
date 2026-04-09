@echo off
echo Applying SOS Emergency Feature Database Migration...
echo.
echo Creating emergency_contacts table...
psql -U postgres -d runterra -f "server\sql\emergency_contacts.sql"
echo.
echo Creating sos_alerts table...
psql -U postgres -d runterra -f "server\sql\sos_alerts.sql"
echo.
if errorlevel 1 (
    echo ERROR: Migration failed!
    pause
    exit /b 1
)
echo ✅ SOS Emergency Feature migration completed successfully!
echo.
echo Next steps:
echo 1. Restart your backend server
echo 2. Add emergency contacts in the Profile page
echo 3. Test the SOS button!
pause
