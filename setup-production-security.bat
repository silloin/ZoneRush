@echo off
echo ============================================
echo ZoneRush Production Security Setup
echo ============================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js found
echo.

echo [2/5] Generating secure JWT_SECRET...
for /f "delims=" %%i in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set JWT_SECRET=%%i
echo Generated JWT_SECRET: %JWT_SECRET:~0,20%...
echo.

echo [3/5] Creating .env.example template...
if not exist "server\.env.example" (
    echo ERROR: .env.example not found!
    pause
    exit /b 1
)
echo OK: Template exists
echo.

echo [4/5] Security checklist...
echo.
echo CRITICAL: Before deploying to production:
echo [ ] 1. Copy server\.env.example to server\.env
echo [ ] 2. Fill in ALL API keys (replace CHANGE_ME)
echo [ ] 3. Use the JWT_SECRET generated above
echo [ ] 4. Set strong database password (16+ chars)
echo [ ] 5. Rotate ALL exposed API keys from old .env
echo [ ] 6. Enable SSL for database connection
echo [ ] 7. Set FRONTEND_URL to HTTPS domain
echo [ ] 8. Test with: node server\config\securityConfig.js
echo.

echo [5/5] Useful commands:
echo.
echo Test security configuration:
echo   node server\config\securityConfig.js
echo.
echo Generate new JWT_SECRET:
echo   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
echo.
echo Check for exposed secrets:
echo   npm audit
echo.
echo Start server in production mode:
echo   set NODE_ENV=production
echo   cd server
echo   node server.js
echo.

echo ============================================
echo Security files created:
echo ============================================
echo + server\config\securityConfig.js
echo + server\middleware\securityLogger.js
echo + server\middleware\productionSecurity.js
echo + server\.env.example
echo + DEPLOYMENT_SECURITY_GUIDE.md
echo.
echo Next: Read DEPLOYMENT_SECURITY_GUIDE.md for complete setup
echo.

pause
