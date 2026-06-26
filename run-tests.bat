@echo off
REM Automated test runner for both topologies
echo ========================================
echo  Automated Network Testing Suite
echo ========================================
echo.

SET RESULTS_DIR=network\results\tests
mkdir %RESULTS_DIR% 2>nul

echo [STEP 1] Testing Traditional Network...
echo ========================================
echo Starting traditional network container...
docker-compose -f docker-compose.mininet.yml up -d mininet-traditional
timeout /t 5 /nobreak > nul

echo.
echo Running traditional topology tests...
docker exec amira-traditional-network bash -c "cd scripts/tests && python3 ping_test.py --output /workspace/results/tests/trad_ping.json"
docker exec amira-traditional-network bash -c "cd scripts/tests && python3 iperf_test.py --output /workspace/results/tests/trad_iperf.json"
docker exec amira-traditional-network bash -c "cd scripts/tests && python3 jitter_test.py --output /workspace/results/tests/trad_jitter.json"
docker exec amira-traditional-network bash -c "cd scripts/tests && python3 failover_test.py --output /workspace/results/tests/trad_failover.json"

echo.
echo Traditional tests complete!
echo Stopping traditional network...
docker-compose -f docker-compose.mininet.yml stop mininet-traditional

echo.
echo [STEP 2] Testing SDN Network...
echo ========================================
echo Starting SDN environment...
docker-compose -f docker-compose.mininet.yml up -d ryu-controller mininet-sdn
timeout /t 10 /nobreak > nul

echo.
echo Running SDN topology tests...
docker exec amira-sdn-network bash -c "cd scripts/tests && python3 ping_test.py --output /workspace/results/tests/sdn_ping.json"
docker exec amira-sdn-network bash -c "cd scripts/tests && python3 iperf_test.py --output /workspace/results/tests/sdn_iperf.json"
docker exec amira-sdn-network bash -c "cd scripts/tests && python3 jitter_test.py --output /workspace/results/tests/sdn_jitter.json"
docker exec amira-sdn-network bash -c "cd scripts/tests && python3 failover_test.py --output /workspace/results/tests/sdn_failover.json"

echo.
echo SDN tests complete!

echo.
echo [STEP 3] Generating Analysis...
echo ========================================
docker exec amira-network-monitor bash -c "cd scripts/analysis && python3 comparison_matrix.py"
docker exec amira-network-monitor bash -c "cd scripts/analysis && python3 chart_generator.py"
docker exec amira-network-monitor bash -c "cd scripts/analysis && python3 ai_conclusion_engine.py"

echo.
echo [COMPLETE] All tests finished!
echo ========================================
echo.
echo Results saved to: %RESULTS_DIR%
echo Analysis saved to: network\results\research
echo Charts available at: network\results\charts
echo.
echo View results:
echo   start network\results\charts\comparison_chart.html
echo   start network\results\research\comparison_matrix_*.html
echo.
echo Stopping all containers...
docker-compose -f docker-compose.mininet.yml down

echo.
echo ========================================
echo  Test Suite Complete!
echo ========================================
pause
