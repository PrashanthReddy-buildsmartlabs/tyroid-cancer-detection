@echo off
title Thyroid Cancer Detection - Production Launcher

echo ===================================================
echo     Starting Local Production System
echo     Powered by Hybrid CNN+LSTM & Waitress
echo ===================================================

echo [1/2] Launching Production Server...
start "ThyroScan Engine" cmd /k "python backend/production.py"

echo [2/2] Waiting for Server Initialization...
timeout /t 5 >nul

echo Opening Application Interface...
start http://localhost:5000

echo.
echo ===================================================
echo      System is LIVE. Do NOT close this window.
echo ===================================================
pause
