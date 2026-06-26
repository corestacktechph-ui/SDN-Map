@echo off
REM Check if everything is ready
echo ========================================
echo  Amira Capstone - Setup Verification
echo ========================================
echo.

set CHECKS_PASSED=0
set CHECKS_TOTAL=6

echo [1/6] Checking Docker installation...
docker --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   ✅ Docker is installed
    docker --version
    set /a CHECKS_PASSED+=1
) else (
    echo   ❌ Docker is NOT installed
    echo   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
)

echo.
echo [2/6] Checking Docker status...
docker ps >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   ✅ Docker is running
    set /a CHECKS_PASSED+=1
) else (
    echo   ❌ Docker is NOT running
    echo   Run start-docker.bat to start Docker Desktop
)

echo.
echo [3/6] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   ✅ Node.js is installed
    node --version
    set /a CHECKS_PASSED+=1
) else (
    echo   ❌ Node.js is NOT installed (needed for web app only)
)

echo.
echo [4/6] Checking required files...
if exist "docker-compose.mininet.yml" (
    echo   ✅ docker-compose.mininet.yml exists
    set /a CHECKS_PASSED+=1
) else (
    echo   ❌ docker-compose.mininet.yml missing
)

echo.
echo [5/6] Checking scripts directory...
if exist "scripts\mininet\traditional_topology.py" (
    echo   ✅ Traditional topology script exists
    set /a CHECKS_PASSED+=1
) else (
    echo   ❌ Traditional topology script missing
)

echo.
echo [6/6] Checking launch scripts...
if exist "run-traditional.bat" (
    echo   ✅ Launch scripts exist
    set /a CHECKS_PASSED+=1
) else (
    echo   ❌ Launch scripts missing
)

echo.
echo ========================================
echo  Results: %CHECKS_PASSED%/%CHECKS_TOTAL% checks passed
echo ========================================
echo.

if %CHECKS_PASSED% GEQ 4 (
    echo ✅ Your setup is ready! You can start running simulations.
    echo.
    echo Quick Start:
    echo   1. Make sure Docker is running: start-docker.bat
    echo   2. Run simulation: run-traditional.bat
    echo.
) else (
    echo ❌ Setup incomplete. Please fix the issues above.
    echo.
    echo Check documentation:
    echo   - QUICK_START.md
    echo   - SETUP_CHECKLIST.md
    echo.
)

pause
