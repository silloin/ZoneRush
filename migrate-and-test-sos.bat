@echo off
echo ========================================
echo SOS Database Migration & Test
echo ========================================
echo.

echo [1/3] Adding missing columns to sos_alerts table...
psql -U postgres -d runterra -c "ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS latitude NUMERIC;"
psql -U postgres -d runterra -c "ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS longitude NUMERIC;"
psql -U postgres -d runterra -c "ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS message TEXT;"
psql -U postgres -d runterra -c "ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS contacts_notified JSONB DEFAULT '[]';"
echo.

echo [2/3] Creating emergency_contacts table if not exists...
psql -U postgres -d runterra -f "..\server\sql\emergency_contacts.sql"
echo.

echo [3/3] Running database tests...
node test-sos-database.js
echo.

pause
