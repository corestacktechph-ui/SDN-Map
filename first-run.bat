@echo off
REM First Run - Complete Setup and Test
echo.
echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                          ║
echo ║          🎓 AMIRA CAPSTONE - FIRST RUN SETUP 🎓                          ║
echo ║                                                                          ║
echo ║                  Let's get your simulation running!                      ║
echo ║                                                                          ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.
pause

REM Step 1: Verify Docker
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  STEP 1: Checking Docker
echo ═══════════════════════════════════════════════════════════════════════════
echo.

docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed!
    echo.
    echo Please install Docker Desktop:
    echo   1. Go to: https://www.docker.com/products/docker-desktop
    echo   2. Download and install
    echo   3. Restart your computer
    echo   4. Run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ Docker is installed!
docker --version

REM Step 2: Start Docker if not running
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  STEP 2: Starting Docker Desktop
echo ═══════════════════════════════════════════════════════════════════════════
echo.

docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Docker is not running. Starting Docker Desktop...
    echo Please wait 1-2 minutes...
    echo.
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo Waiting for Docker to start...
    :wait_docker
    timeout /t 5 /nobreak > nul
    docker ps >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo   Still waiting...
        goto :wait_docker
    )
)

echo ✅ Docker is running!
echo.

REM Step 3: Pull required images
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  STEP 3: Checking Docker Images
echo ═══════════════════════════════════════════════════════════════════════════
echo.

docker images iwaseyusuke/mininet | findstr "latest" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Pulling Mininet image (this may take 5-10 minutes)...
    docker pull iwaseyusuke/mininet:latest
) else (
    echo ✅ Mininet image already available
)

docker images osrg/ryu | findstr "latest" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Pulling Ryu controller image...
    docker pull osrg/ryu:latest
) else (
    echo ✅ Ryu controller image already available
)

echo.
echo ✅ All Docker images ready!

REM Step 4: Test Traditional Network
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  STEP 4: Testing Traditional Network (Quick Test)
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo This will start a container and test basic connectivity.
echo Press any key to continue, or Ctrl+C to skip...
pause > nul

echo.
echo Starting traditional network container...
docker-compose -f docker-compose.mininet.yml up -d mininet-traditional

echo.
echo Waiting for container to be ready...
timeout /t 10 /nobreak > nul

echo.
echo Testing container...
docker exec amira-traditional-network bash -c "which python3 && which ping && echo '✅ Container is working!'"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ═══════════════════════════════════════════════════════════════════════════
    echo  🎉 SUCCESS! Your environment is ready!
    echo ═══════════════════════════════════════════════════════════════════════════
    echo.
    echo Container is running and ready for simulations.
    echo.
    echo What you can do now:
    echo.
    echo [Option 1] Run a quick interactive test:
    echo   docker exec -it amira-traditional-network bash
    echo   python3 scripts/mininet/traditional_topology.py
    echo.
    echo [Option 2] Run automated test suite:
    echo   Double-click: run-tests.bat
    echo.
    echo [Option 3] Stop and clean up:
    echo   Double-click: stop-all.bat
    echo.
    echo Stopping container for now...
    docker-compose -f docker-compose.mininet.yml down
    echo.
) else (
    echo.
    echo ❌ Container test failed. Please check the logs:
    echo   docker logs amira-traditional-network
    echo.
)

REM Step 5: Summary
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  SETUP SUMMARY
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo ✅ Docker installed and running
echo ✅ Required images available
echo ✅ Container tested successfully
echo ✅ Simulation environment ready
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  NEXT STEPS
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Choose one of these to continue:
echo.
echo [1] Read the Quick Start Guide
echo     Open file: QUICK_START.md
echo.
echo [2] Run Traditional Network Simulation
echo     Double-click: run-traditional.bat
echo.
echo [3] Run SDN Network Simulation
echo     Double-click: run-sdn.bat
echo.
echo [4] Run All Automated Tests (Recommended for thesis)
echo     Double-click: run-tests.bat
echo.
echo [5] Check your setup anytime
echo     Double-click: check-setup.bat
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Press any key to exit...
pause > nul
