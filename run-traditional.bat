@echo off
REM Quick launcher for Traditional Network Simulation
echo ========================================
echo  Traditional Network Simulation Launcher
echo ========================================
echo.

echo [1/3] Starting Docker containers...
docker-compose -f docker-compose.mininet.yml up -d mininet-traditional

echo.
echo [2/3] Waiting for container to be ready...
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Launching simulation...
echo.
echo ========================================
echo  Container is ready!
echo ========================================
echo.
echo To enter the simulation:
echo   docker exec -it amira-traditional-network bash
echo.
echo Then run inside container:
echo   python3 scripts/mininet/traditional_topology.py
echo.
echo Or run tests:
echo   cd scripts/tests
echo   python3 ping_test.py
echo   python3 iperf_test.py
echo   python3 failover_test.py
echo.
echo To stop:
echo   docker-compose -f docker-compose.mininet.yml down
echo.
echo ========================================

pause
