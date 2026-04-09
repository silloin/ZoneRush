@echo off
echo ========================================
echo SOS Database Fix - Location Column
echo ========================================
echo.

echo The sos_alerts table has a NOT NULL constraint on the location column
echo that conflicts with the new latitude/longitude columns.
echo.

echo Fixing database schema...
psql -U postgres -d runterra -c "ALTER TABLE sos_alerts ALTER COLUMN location DROP NOT NULL;"

echo.
echo ✅ Database fixed!
echo.
echo You can now use the SOS button successfully.
echo.
pause
