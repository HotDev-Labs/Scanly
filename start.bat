@echo off
title Scanly
echo ===================================================
echo Starting Scanly...
echo ===================================================
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% equ 0 (
    python run_app.py
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        py run_app.py
    ) else (
        echo.
        echo [ERROR] Python was not found in your system PATH!
        echo Please make sure Python 3.10+ is installed and check "Add Python to PATH".
        echo You can download it from https://www.python.org/downloads/
        echo.
    )
)
pause
