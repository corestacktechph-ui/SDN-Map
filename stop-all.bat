@echo off
REM Stop all simulation containers
echo Stopping all simulation containers...
docker-compose -f docker-compose.mininet.yml down

echo.
echo All containers stopped.
echo.
pause
