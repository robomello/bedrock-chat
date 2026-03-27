@echo off
title Bedrock Chat - Setup
echo.
echo  ================================
echo   Bedrock Chat - Setup
echo  ================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.11+ first.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+ first.
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt -q
pip install anthropic -q

echo [2/4] Building frontend...
cd frontend
call npm install --silent
call npm run build
cd ..

echo [3/4] Creating .env config...
if not exist .env (
    copy .env.example .env
    echo.
    echo  !! Edit .env with your API key and endpoint !!
    echo  File location: %cd%\.env
    echo.
)

echo [4/4] Creating desktop shortcuts...
powershell -ExecutionPolicy Bypass -File create-shortcuts.ps1

echo.
echo  ================================
echo   Setup complete!
echo  ================================
echo.
echo  1. Edit .env with your credentials
echo  2. Double-click "Bedrock Chat" on your Desktop
echo.
pause
