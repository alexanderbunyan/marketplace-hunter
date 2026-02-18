@echo off
cd /d "%~dp0"

echo Stopping Marketplace Hunter...
docker-compose stop

echo.
echo Hunter is asleep.
timeout /t 3 /nobreak >nul
