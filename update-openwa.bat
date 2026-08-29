@echo off
echo ========================================
echo OpenWA WhatsApp Gateway - Update Script
echo ========================================
echo.

cd openwa-server

REM 1. Check current version
echo [1] Current version:
git log --oneline -1
echo.

REM 2. Fetch latest from origin
echo [2] Checking for updates...
git fetch --tags --quiet 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Cannot fetch from remote. Check internet connection.
    pause
    exit /b 1
)

REM 3. Compare versions
git rev-list HEAD..origin/main --count > temp_count.txt
set /p BEHIND=<temp_count.txt
del temp_count.txt 2>nul

if "%BEHIND%"=="0" (
    echo [✓] You are already on the latest version!
    pause
    exit /b 0
) else (
    echo [!] There are %BEHIND% new commit(s) available.
    echo New version will be: v??.?? (after git pull)
)

REM 4. Backup current session (just in case)
echo [3] Creating backup...
robocopy ..\openwa-data-backup-temp .. openwa.sqlite .api-key .env.generated /NFL /NDL /NC /NS /NP 2>nul || echo Backup skipped...

REM 5. Update
echo [4] Pulling updates...
git pull origin main --ff-only 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Git pull may need manual intervention. Session data preserved.
    echo Run: git status to see current state
)

REM 6. Rebuild if needed
echo [5] Checking rebuild...
if exist "dist\main.js" (
    echo Old dist exists, skipping rebuild unless source changed.
) else (
    echo Rebuilding...
    npm run build > build.log 2>&1
    if %errorlevel% neq 0 (
        echo Build failed. Check build.log for details.
        pause
        exit /b 1
    )
)

REM 7. Restart service
echo [6] Service restart required!
echo Please stop OpenWA service, then restart with:
echo   cd E:\Projects\mudahsewa\openwa-server
echo   npm start
echo.
echo Data files (sessions, API keys) preserved automatically!
echo.
pause
