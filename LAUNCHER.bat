@echo off
REM Master Launcher for Amira Capstone
title Amira Capstone - SDN Migration Platform
color 0A

:menu
cls
echo.
echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                          ║
echo ║          🎓 AMIRA CAPSTONE - SDN MIGRATION PLATFORM 🎓                   ║
echo ║                                                                          ║
echo ║              Network Simulation Control Center                           ║
echo ║                                                                          ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  MAIN MENU
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo  [1] 🚀 First Run Setup (New users start here!)
echo  [2] 🔧 Check Setup Status
echo  [3] 🐳 Start Docker Desktop
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  SIMULATIONS
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo  [4] 🌐 Run Traditional Network
echo  [5] 🤖 Run SDN Network with Ryu Controller
echo  [6] 🧪 Run All Automated Tests
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  RESULTS & MONITORING
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo  [7] 📊 View Results in Browser
echo  [8] 📁 Open Results Folder
echo  [9] 📋 View Running Containers
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  DOCUMENTATION
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo  [10] 📖 Open Quick Start Guide
echo  [11] 📚 Open Full Documentation
echo  [12] 🔄 Open Workflow Diagram
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  MAINTENANCE
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo  [13] 🛑 Stop All Containers
echo  [14] 🗑️  Clean Up Docker
echo  [15] 💾 Setup Database
echo.
echo  [0] ❌ Exit
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
set /p choice="Enter your choice (0-15): "

if "%choice%"=="0" goto :exit
if "%choice%"=="1" goto :first_run
if "%choice%"=="2" goto :check_setup
if "%choice%"=="3" goto :start_docker
if "%choice%"=="4" goto :trad_network
if "%choice%"=="5" goto :sdn_network
if "%choice%"=="6" goto :run_tests
if "%choice%"=="7" goto :view_results
if "%choice%"=="8" goto :open_folder
if "%choice%"=="9" goto :view_containers
if "%choice%"=="10" goto :quick_start
if "%choice%"=="11" goto :full_docs
if "%choice%"=="12" goto :workflow
if "%choice%"=="13" goto :stop_all
if "%choice%"=="14" goto :cleanup
if "%choice%"=="15" goto :setup_db

echo.
echo ❌ Invalid choice. Please try again.
timeout /t 2 > nul
goto :menu

:first_run
cls
call first-run.bat
goto :menu

:check_setup
cls
call check-setup.bat
goto :menu

:start_docker
cls
call start-docker.bat
goto :menu

:trad_network
cls
echo.
echo Starting Traditional Network Simulation...
echo.
call run-traditional.bat
goto :menu

:sdn_network
cls
echo.
echo Starting SDN Network Simulation...
echo.
call run-sdn.bat
goto :menu

:run_tests
cls
echo.
echo Running Automated Tests...
echo This will take 10-15 minutes...
echo.
call run-tests.bat
goto :menu

:view_results
cls
echo.
echo Opening results in browser...
call view-results.bat
goto :menu

:open_folder
cls
echo.
echo Opening results folder...
start "" "network\results"
echo.
echo Press any key to return to menu...
pause > nul
goto :menu

:view_containers
cls
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  Running Docker Containers
echo ═══════════════════════════════════════════════════════════════════════════
echo.
docker ps
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Press any key to return to menu...
pause > nul
goto :menu

:quick_start
cls
echo.
echo Opening Quick Start Guide...
start "" "QUICK_START.md"
echo.
echo Press any key to return to menu...
pause > nul
goto :menu

:full_docs
cls
echo.
echo Opening Full Documentation...
start "" "README.md"
echo.
echo Press any key to return to menu...
pause > nul
goto :menu

:workflow
cls
echo.
echo Opening Workflow Diagram...
start "" "WORKFLOW_DIAGRAM.md"
echo.
echo Press any key to return to menu...
pause > nul
goto :menu

:stop_all
cls
echo.
echo Stopping all containers...
call stop-all.bat
goto :menu

:cleanup
cls
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  Docker Cleanup
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo This will remove:
echo   - Stopped containers
echo   - Unused networks
echo   - Dangling images
echo.
set /p confirm="Continue? (Y/N): "
if /i "%confirm%"=="Y" (
    echo.
    echo Cleaning up...
    docker system prune -f
    echo.
    echo ✅ Cleanup complete!
) else (
    echo.
    echo Cleanup cancelled.
)
echo.
echo Press any key to return to menu...
pause > nul
goto :menu

:setup_db
cls
echo.
echo Setting up database...
call setup-database.bat
goto :menu

:exit
cls
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo  Thank you for using Amira Capstone SDN Migration Platform!
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Good luck with your thesis! 🎓
echo.
timeout /t 2 > nul
exit
