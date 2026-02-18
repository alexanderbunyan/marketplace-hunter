@echo off
cd /d "%~dp0"

echo Stopping Marketplace Hunter (Local Mode)...

echo.
echo Killing Backend processes (Python/Uvicorn)...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo.
echo Killing Frontend processes (Node)...
taskkill /F /IM node.exe /T 2>nul

echo.
echo Hunter is asleep.
timeout /t 3 /nobreak >nul
