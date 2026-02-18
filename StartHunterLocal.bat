@echo off
cd /d "%~dp0"
setlocal EnableDelayedExpansion

echo ==========================================
echo   Starting Marketplace Hunter (Local)
echo ==========================================

echo.
echo [1/5] Cleaning up old processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

echo.
echo [2/5] Launching Backend API (Port 8000)...
REM using /k to keep window open if it crashes
start "MH Backend" cmd /k "cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo.
echo [3/5] Launching Frontend (Port 3000)...
if not exist "frontend_v2\node_modules" (
    echo ERROR: node_modules not found in frontend_v2 directory.
    echo Please run 'npm install' in the frontend_v2 directory.
    pause
    exit /b
)
REM We let Vite handle the proxy to avoid CORS issues
start "MH Frontend" cmd /k "cd frontend_v2 && npm run dev"

echo.
echo [4/5] Waiting for Backend to be ready...
:check_backend
timeout /t 2 /nobreak >nul
curl -s -f http://127.0.0.1:8000/docs >nul
if !errorlevel! neq 0 (
    echo    ... Backend not ready yet. Retrying...
    goto check_backend
)
echo    Backend is UP!

echo.
echo [5/5] Launching Browser...
start http://localhost:3000

echo.
echo ==========================================
echo   Marketplace Hunter is Ready!
echo   Backend: http://127.0.0.1:8000
echo   Frontend: http://localhost:3000
echo ==========================================
echo.
echo IMPORTANT: Do not close the other terminal windows!
pause
