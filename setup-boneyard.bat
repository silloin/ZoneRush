@echo off
REM ============================================
REM Boneyard-js Setup Script for ZoneRush
REM Automates skeleton loading implementation
REM ============================================

echo.
echo ========================================
echo  Boneyard-js Setup for ZoneRush
echo ========================================
echo.

cd client

REM Step 1: Check if already installed
echo [1/5] Checking boneyard-js installation...
npm list boneyard-js >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ boneyard-js is already installed
) else (
    echo Installing boneyard-js...
    npm install boneyard-js --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Installation failed!
        pause
        exit /b 1
    )
    echo ✓ boneyard-js installed successfully
)
echo.

REM Step 2: Create bones directory
echo [2/5] Creating bones directory...
if not exist "src\bones" mkdir "src\bones"
echo ✓ Bones directory created
echo.

REM Step 3: Verify package.json scripts
echo [3/5] Verifying build scripts...
findstr /C:"bones:build" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Build scripts are configured
) else (
    echo WARNING: Build scripts not found in package.json
    echo Please add manually:
    echo   "bones:build": "npx boneyard-js build"
    echo   "bones:watch": "npx boneyard-js build --watch"
)
echo.

REM Step 4: Display instructions
echo [4/5] Setup Instructions
echo.
echo Next steps to complete implementation:
echo.
echo 1. Wrap your components with ^<Skeleton^>:
echo    - Open: src\pages\TrainingPlans.jsx
echo    - Add: import { Skeleton } from 'boneyard-js/react';
echo    - Wrap return with: ^<Skeleton name="training-plans-page" loading={loading}^>
echo.
echo 2. Start dev server:
echo    npm run dev
echo.
echo 3. Navigate to the page in browser
echo.
echo 4. Generate bone snapshots:
echo    npm run bones:build
echo.
echo 5. Import registry in main.jsx:
echo    Add: import '.\bones\registry'
echo.
echo See BONEYARD_QUICKSTART.md for detailed guide!
echo.

REM Step 5: Offer to open documentation
echo [5/5] Documentation
echo.
set /p OPEN_DOCS="Open quick start guide? (Y/N): "
if /i "%OPEN_DOCS%"=="Y" (
    start "" "BONEYARD_QUICKSTART.md"
    echo ✓ Opened quick start guide
) else (
    echo Documentation available at:
    echo   - BONEYARD_QUICKSTART.md (Quick start)
    echo   - BONEYARD_IMPLEMENTATION_GUIDE.md (Full guide)
    echo   - src\components\SkeletonExamples.jsx (Code examples)
)
echo.

echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Ready to implement pixel-perfect skeletons! 🎯
echo.

pause
