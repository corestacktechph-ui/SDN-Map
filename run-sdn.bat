@echo off
REM Quick launcher for SDN Network Simulation
echo ========================================
echo  SDN Network Simulation Launcher
echo ========================================
echo.

echo [1/3] Starting Ryu Controller...
docker-compose -f docker-compose.mininet.yml up -d ryu-controller

echo.
echo [2/3] Starting SDN Network...
docker-compose -f docker-compose.mininet.yml up -d mininet-sdn

echo.
echo [3/3] Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo ========================================
echo  SDN Environment is ready!
echo ========================================
echo.
echo To enter the simulation:
echo   docker exec -it amira-sdn-network bash
echo.
echo Then run inside container:
echo   python3 scripts/mininet/sdn_topology.py
echo.
echo Or run tests:
echo   cd scripts/tests
echo   python3 ping_test.py --topology sdn
echo   python3 iperf_test.py --topology sdn
echo   python3 failover_test.py --topology sdn
echo.
echo View Ryu Controller logs:
echo   docker logs -f amira-ryu-controller
echo.
echo To stop all:
echo   docker-compose -f docker-compose.mininet.yml down
echo.
echo ========================================

pause
