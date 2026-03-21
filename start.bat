@echo off
REM Galaxium Travels - Local Development Startup Script for Windows
REM This script starts both the backend and frontend servers

setlocal enabledelayedexpansion

REM Colors are limited in Windows CMD, but we can use echo for structure
echo.
echo ================================================================
echo.
echo         Galaxium Travels - Booking System
echo.
echo ================================================================
echo.

REM Get the directory where the script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [INFO] Starting Galaxium Travels application...
echo.

REM ==================== Prerequisites Check ====================
echo [INFO] Checking prerequisites...

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% found

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm.
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% found

echo.

REM ==================== Backend Setup ====================
echo [INFO] Setting up backend...

cd booking_system_backend

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install/update dependencies
echo [INFO] Installing backend dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
echo [OK] Backend dependencies installed

REM Check if port 8081 is available
netstat -ano | findstr :8081 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 8081 is already in use. Backend may fail to start.
    set /p CONTINUE="Do you want to continue? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
)

REM Start backend server in new window
echo [INFO] Starting backend server on http://localhost:8081...
start "Galaxium Backend" cmd /k "call .venv\Scripts\activate.bat && python server.py"

REM Wait for backend to start
timeout /t 3 /nobreak >nul
echo [OK] Backend server started in new window

cd ..

echo.

REM ==================== Frontend Setup ====================
echo [INFO] Setting up frontend...

cd booking_system_frontend

REM Check if .env file exists, if not create from example
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env file from .env.example...
        copy .env.example .env >nul
        echo [OK] .env file created
    ) else (
        echo [INFO] Creating default .env file...
        echo VITE_API_URL=http://localhost:8080 > .env
        echo [OK] .env file created
    )
) else (
    echo [OK] .env file already exists
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies (this may take a few minutes)...
    call npm install
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)

REM Check if port 5173 is available
netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 5173 is already in use. Frontend may fail to start.
    set /p CONTINUE="Do you want to continue? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
)

REM Start frontend server in new window
echo [INFO] Starting frontend server on http://localhost:5173...
start "Galaxium Frontend" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 3 /nobreak >nul
echo [OK] Frontend server started in new window

cd ..

echo.

REM ==================== Success Message ====================
echo ================================================================
echo   SUCCESS! Galaxium Travels is now running!
echo ================================================================
echo.
echo   Access the application:
echo.
echo   Frontend:        http://localhost:5173
echo   Backend API:     http://localhost:8081
echo   API Docs:        http://localhost:8081/docs
echo   MCP Endpoint:    http://localhost:8081/mcp
echo.
echo ================================================================
echo.
echo [INFO] Both servers are running in separate windows.
echo [INFO] Close those windows to stop the servers.
echo.
echo Press any key to exit this window...
pause >nul

@REM Made with Bob
