@echo off
cd /d "%~dp0"
setlocal EnableDelayedExpansion

echo ==========================================
echo   Starting Marketplace Hunter (Docker)
echo ==========================================

echo.
echo [1/3] Checking Docker status...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b
)
echo Docker is running.

echo.
echo [2/3] Transforming Containers...
docker-compose down -v
docker-compose up -d --build

echo.
echo [3/3] Waiting for Services...

:wait_backend
timeout /t 2 /nobreak >nul
curl -s -f http://localhost:8000/docs >nul
if errorlevel 1 (
    echo    ... Backend not ready yet
    goto wait_backend
)
echo    Backend is UP!

:wait_frontend
timeout /t 2 /nobreak >nul
curl -s -f http://localhost:3000 >nul
if errorlevel 1 (
    echo    ... Frontend not ready yet
    goto wait_frontend
)
echo    Frontend is UP!

echo.
echo ==========================================
echo   Marketplace Hunter is Ready!
echo   Frontend: http://localhost:3000
echo ==========================================
echo.
start http://localhost:3000
pause
