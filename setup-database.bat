@echo off
REM Database Setup Script
echo ========================================
echo  Database Setup for Amira Capstone
echo ========================================
echo.

echo [Step 1/3] Stopping any Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul

echo.
echo [Step 2/3] Generating Prisma Client...
call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Prisma generate failed.
    echo Please close VS Code and any Node.js processes, then try again.
    echo.
    pause
    exit /b 1
)

echo.
echo [Step 3/3] Applying database schema...
call npx prisma db push --accept-data-loss

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Database push failed.
    echo Please check your DATABASE_URL in .env file.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Database Setup Complete!
echo ========================================
echo.
echo You can now:
echo   1. Start the web app: npm run dev
echo   2. Run simulations: run-traditional.bat
echo.
pause
