@echo off
REM Start Docker Desktop
echo ========================================
echo  Starting Docker Desktop
echo ========================================
echo.

echo Checking Docker status...
docker ps >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Docker is already running!
    echo.
    goto :menu
)

echo.
echo Docker is not running. Starting Docker Desktop...
echo.
echo Please wait while Docker Desktop starts...
echo This may take 1-2 minutes...
echo.

start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Waiting for Docker to be ready...
:wait_loop
timeout /t 5 /nobreak > nul
docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Still waiting...
    goto :wait_loop
)

echo.
echo ✅ Docker Desktop is now running!
echo.

:menu
echo ========================================
echo  What would you like to do?
echo ========================================
echo.
echo [1] Start Traditional Network Simulation
echo [2] Start SDN Network Simulation
echo [3] Run All Automated Tests
echo [4] Check Docker Status
echo [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    call run-traditional.bat
    goto :end
)
if "%choice%"=="2" (
    call run-sdn.bat
    goto :end
)
if "%choice%"=="3" (
    call run-tests.bat
    goto :end
)
if "%choice%"=="4" (
    docker ps
    echo.
    pause
    goto :menu
)
if "%choice%"=="5" (
    goto :end
)

echo Invalid choice. Please try again.
pause
goto :menu

:end
echo.
echo ========================================
echo  Done!
echo ========================================
pause
