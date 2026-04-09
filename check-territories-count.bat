@echo off
echo ============================================
echo CHECKING CURRENT TERRITORIES COUNT
echo ============================================
echo.

cd /d "%~dp0"
set PGPASSWORD=8810

echo Checking territories_captured column in users table...
echo.
psql -U postgres -h localhost -p 5432 -d zonerush -c "SELECT id, username, territories_captured, territory_points, total_territory_area FROM users ORDER BY territories_captured DESC;"

echo.
echo ============================================
echo Comparing with actual territories count...
echo ============================================
echo.
psql -U postgres -h localhost -p 5432 -d zonerush -c "SELECT u.id, u.username, COUNT(t.id) as actual_territories FROM users u LEFT JOIN territories t ON u.id = t.user_id WHERE t.is_stolen = FALSE OR t.is_stolen IS NULL GROUP BY u.id, u.username ORDER BY actual_territories DESC;"

echo.
pause
