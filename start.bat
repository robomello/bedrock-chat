@echo off
title Bedrock Chat
cd /d "%~dp0"
set BEDROCK_CHAT_PASSPHRASE=otto-bedrock-2026
set NO_PROXY=*

:: Wait a moment then open browser
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8080"

:: Start the server
python run.py
