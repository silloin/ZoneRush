@echo off
REM ============================================
REM Mobile Responsiveness Test Runner
REM Automated testing with Playwright
REM ============================================

echo.
echo ========================================
echo  ZoneRush Mobile Responsiveness Tests
echo ========================================
echo.

REM Check if dev server is running
echo [1/4] Checking dev server...
curl -s http://localhost:5173 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Dev server not detected on port 5173
    echo.
    set /p START_SERVER="Start dev server now? (Y/N): "
    if /i "%START_SERVER%"=="Y" (
        echo Starting dev server...
        start "ZoneRush Dev Server" cmd /k "cd client && npm run dev"
        echo Waiting for server to start (30 seconds)...
        timeout /t 30 /nobreak >nul
    ) else (
        echo Please start dev server manually and run this script again.
        pause
        exit /b 1
    )
) else (
    echo ✓ Dev server is running
)
echo.

REM Install Playwright browsers if needed
echo [2/4] Checking Playwright installation...
npx playwright --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing Playwright...
    npm install --save-dev @playwright/test
    npx playwright install
) else (
    echo ✓ Playwright is installed
)
echo.

REM Show test options
echo [3/4] Select Test Mode:
echo.
echo 1. Run all tests (recommended)
echo 2. Run mobile tests only
echo 3. Run with UI mode (visual debugging)
echo 4. Update baseline screenshots
echo 5. View previous test results
echo.

set /p CHOICE="Enter choice (1-5): "

if "%CHOICE%"=="1" goto RUN_ALL
if "%CHOICE%"=="2" goto RUN_MOBILE
if "%CHOICE%"=="3" goto RUN_UI
if "%CHOICE%"=="4" goto UPDATE_BASELINE
if "%CHOICE%"=="5" goto VIEW_RESULTS

echo Invalid choice. Running all tests...
goto RUN_ALL

:RUN_ALL
echo.
echo ========================================
echo  Running All Responsiveness Tests
echo ========================================
echo.
npx playwright test tests/mobile-responsiveness.spec.js
goto SHOW_RESULTS

:RUN_MOBILE
echo.
echo ========================================
echo  Running Mobile-Only Tests
echo ========================================
echo.
npx playwright test tests/mobile-responsiveness.spec.js --project="Mobile Chrome" --project="Mobile Safari"
goto SHOW_RESULTS

:RUN_UI
echo.
echo ========================================
echo  Launching UI Mode (Visual Debugging)
echo ========================================
echo.
echo Close the UI window when done testing.
npx playwright test --ui
goto END

:UPDATE_BASELINE
echo.
echo ========================================
echo  Updating Baseline Screenshots
echo ========================================
echo.
echo This will capture new reference screenshots.
echo Only do this after intentional design changes!
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    goto END
)
npx playwright test --update-snapshots
goto SHOW_RESULTS

:VIEW_RESULTS
echo.
echo ========================================
echo  Opening Test Results
echo ========================================
echo.
if exist "test-results\html-report\index.html" (
    start "" "test-results\html-report\index.html"
    echo ✓ Opened test results in browser
) else (
    echo No test results found. Run tests first.
)
goto END

:SHOW_RESULTS
echo.
echo ========================================
echo  Tests Complete!
echo ========================================
echo.

if exist "test-results\html-report\index.html" (
    set /p OPEN_REPORT="Open HTML report? (Y/N): "
    if /i "%OPEN_REPORT%"=="Y" (
        start "" "test-results\html-report\index.html"
    )
)

:END
echo.
echo ========================================
echo  Summary
echo ========================================
echo.
echo Test files: tests/mobile-responsiveness.spec.js
echo Config: playwright.config.js
echo Results: test-results/html-report/
echo.
echo For more info, see: MOBILE_RESPONSIVENESS_TESTING.md
echo.
pause
