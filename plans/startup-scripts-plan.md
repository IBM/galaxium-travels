# Startup Scripts Plan for Dual Frontend Support

## Overview
This document outlines the changes needed to support running both the original frontend (port 5173) and the new seat classes frontend (port 5174) simultaneously.

## Current Startup Scripts

### start.sh (Unix/Linux/macOS)
**Current Behavior:**
- Starts backend on port 8000
- Starts single frontend on port 5173

### start.bat (Windows)
**Current Behavior:**
- Starts backend on port 8000
- Starts single frontend on port 5173

## Updated Startup Scripts

### Updated start.sh

```bash
#!/bin/bash

# Galaxium Travels - Dual Frontend Startup Script
# This script starts the backend and both frontend applications

set -e  # Exit on error

echo "🚀 Starting Galaxium Travels Booking System..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
    # Kill all background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Check if ports are available
echo "🔍 Checking port availability..."
check_port 8000 || { echo "Backend port 8000 is in use. Please stop the existing process."; exit 1; }
check_port 5173 || { echo "Frontend port 5173 is in use. Please stop the existing process."; exit 1; }
check_port 5174 || { echo "Frontend port 5174 is in use. Please stop the existing process."; exit 1; }

# Start Backend
echo -e "\n${BLUE}📦 Starting Backend (Port 8000)...${NC}"
cd booking_system_backend

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies if needed
if [ ! -f ".venv/installed" ]; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
    touch .venv/installed
fi

# Seed database
echo "Seeding database..."
python seed.py

# Start backend server
echo "Starting FastAPI server..."
uvicorn server:app --reload --log-level info > ../backend.log 2>&1 &
BACKEND_PID=$!

cd ..

# Wait for backend to start
echo "Waiting for backend to be ready..."
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/flights > /dev/null; then
    echo -e "${YELLOW}⚠️  Backend may not have started correctly. Check backend.log${NC}"
fi

# Start Original Frontend (Port 5173)
echo -e "\n${BLUE}🎨 Starting Original Frontend (Port 5173)...${NC}"
cd booking_system_frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm run dev > ../frontend-original.log 2>&1 &
FRONTEND_ORIGINAL_PID=$!

cd ..

# Start New Frontend with Seat Classes (Port 5174)
echo -e "\n${BLUE}🎨 Starting Seat Classes Frontend (Port 5174)...${NC}"
cd booking_system_frontend_classes

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm run dev > ../frontend-classes.log 2>&1 &
FRONTEND_CLASSES_PID=$!

cd ..

# Wait for frontends to start
echo "Waiting for frontends to be ready..."
sleep 5

# Display status
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📍 Service URLs:${NC}"
echo -e "   Backend API:              ${GREEN}http://localhost:8000${NC}"
echo -e "   Original Frontend:        ${GREEN}http://localhost:5173${NC}"
echo -e "   Seat Classes Frontend:    ${GREEN}http://localhost:5174${NC}"
echo ""
echo -e "${BLUE}📋 API Documentation:${NC}"
echo -e "   Swagger UI:               ${GREEN}http://localhost:8000/docs${NC}"
echo -e "   ReDoc:                    ${GREEN}http://localhost:8000/redoc${NC}"
echo ""
echo -e "${BLUE}📝 Log Files:${NC}"
echo -e "   Backend:                  backend.log"
echo -e "   Original Frontend:        frontend-original.log"
echo -e "   Seat Classes Frontend:    frontend-classes.log"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and monitor processes
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Backend process died. Check backend.log${NC}"
        exit 1
    fi
    
    # Check if original frontend is still running
    if ! kill -0 $FRONTEND_ORIGINAL_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Original frontend process died. Check frontend-original.log${NC}"
        exit 1
    fi
    
    # Check if seat classes frontend is still running
    if ! kill -0 $FRONTEND_CLASSES_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Seat classes frontend process died. Check frontend-classes.log${NC}"
        exit 1
    fi
    
    sleep 5
done
```

### Updated start.bat

```batch
@echo off
REM Galaxium Travels - Dual Frontend Startup Script
REM This script starts the backend and both frontend applications

echo ========================================
echo Starting Galaxium Travels Booking System
echo ========================================
echo.

REM Check if ports are available
echo Checking port availability...
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo ERROR: Port 8000 is already in use
    echo Please stop the existing process and try again
    pause
    exit /b 1
)

netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo ERROR: Port 5173 is already in use
    echo Please stop the existing process and try again
    pause
    exit /b 1
)

netstat -ano | findstr :5174 >nul
if %errorlevel% equ 0 (
    echo ERROR: Port 5174 is already in use
    echo Please stop the existing process and try again
    pause
    exit /b 1
)

REM Start Backend
echo.
echo Starting Backend (Port 8000)...
cd booking_system_backend

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies if needed
if not exist ".venv\installed" (
    echo Installing backend dependencies...
    pip install -r requirements.txt
    type nul > .venv\installed
)

REM Seed database
echo Seeding database...
python seed.py

REM Start backend server
echo Starting FastAPI server...
start "Galaxium Backend" cmd /k "uvicorn server:app --reload --log-level info"

cd ..

REM Wait for backend to start
echo Waiting for backend to be ready...
timeout /t 5 /nobreak >nul

REM Start Original Frontend (Port 5173)
echo.
echo Starting Original Frontend (Port 5173)...
cd booking_system_frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Start frontend
start "Galaxium Frontend (Original)" cmd /k "npm run dev"

cd ..

REM Start New Frontend with Seat Classes (Port 5174)
echo.
echo Starting Seat Classes Frontend (Port 5174)...
cd booking_system_frontend_classes

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Start frontend
start "Galaxium Frontend (Seat Classes)" cmd /k "npm run dev"

cd ..

REM Wait for frontends to start
echo Waiting for frontends to be ready...
timeout /t 5 /nobreak >nul

REM Display status
echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Service URLs:
echo   Backend API:              http://localhost:8000
echo   Original Frontend:        http://localhost:5173
echo   Seat Classes Frontend:    http://localhost:5174
echo.
echo API Documentation:
echo   Swagger UI:               http://localhost:8000/docs
echo   ReDoc:                    http://localhost:8000/redoc
echo.
echo Press any key to open the frontends in your browser...
pause >nul

REM Open browsers
start http://localhost:5173
start http://localhost:5174

echo.
echo Services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause
```

## New Helper Scripts

### start-backend-only.sh
```bash
#!/bin/bash
# Start only the backend service

echo "🚀 Starting Backend Only..."

cd booking_system_backend
source .venv/bin/activate
python seed.py
uvicorn server:app --reload --log-level info
```

### start-frontend-original.sh
```bash
#!/bin/bash
# Start only the original frontend

echo "🚀 Starting Original Frontend (Port 5173)..."

cd booking_system_frontend
npm run dev
```

### start-frontend-classes.sh
```bash
#!/bin/bash
# Start only the seat classes frontend

echo "🚀 Starting Seat Classes Frontend (Port 5174)..."

cd booking_system_frontend_classes
npm run dev
```

### stop-all.sh
```bash
#!/bin/bash
# Stop all services

echo "🛑 Stopping all services..."

# Kill processes on specific ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped"
```

## Environment Configuration

### Backend .env (if needed)
```env
# Backend Configuration
PORT=8000
DATABASE_URL=sqlite:///./booking_system.db
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Original Frontend .env
```env
# Original Frontend Configuration
VITE_API_URL=http://localhost:8000
VITE_PORT=5173
```

### Seat Classes Frontend .env
```env
# Seat Classes Frontend Configuration
VITE_API_URL=http://localhost:8000
VITE_PORT=5174
```

## CORS Configuration Update

### Update server.py CORS settings
```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Update CORS to allow both frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Original frontend
        "http://localhost:5174",  # Seat classes frontend
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Documentation Updates

### Update STARTUP_GUIDE.md
```markdown
# Startup Guide

## Quick Start

### Start All Services (Recommended)
```bash
# Unix/Linux/macOS
./start.sh

# Windows
start.bat
```

This will start:
- Backend API on port 8000
- Original Frontend on port 5173
- Seat Classes Frontend on port 5174

### Start Individual Services

#### Backend Only
```bash
./start-backend-only.sh
```

#### Original Frontend Only
```bash
./start-frontend-original.sh
```

#### Seat Classes Frontend Only
```bash
./start-frontend-classes.sh
```

### Stop All Services
```bash
./stop-all.sh
```

## Service URLs

- **Backend API**: http://localhost:8000
- **Original Frontend**: http://localhost:5173
- **Seat Classes Frontend**: http://localhost:5174
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc

## Choosing a Frontend

### Original Frontend (Port 5173)
- Simple booking interface
- Single seat class (Economy)
- Backward compatible
- Recommended for basic usage

### Seat Classes Frontend (Port 5174)
- Advanced booking interface
- Multiple seat classes (Economy, Business, Galaxium)
- Enhanced features
- Recommended for full experience

Both frontends connect to the same backend and share the same database.
```

## Testing Checklist

### Startup Script Testing
- [ ] Both frontends start successfully
- [ ] Backend starts and seeds database
- [ ] Port conflict detection works
- [ ] Cleanup on exit works correctly
- [ ] Log files are created
- [ ] Process monitoring works

### Cross-Frontend Testing
- [ ] Both frontends can access backend simultaneously
- [ ] Bookings from one frontend visible in the other
- [ ] No CORS errors
- [ ] No port conflicts
- [ ] Data consistency across frontends

### Error Handling
- [ ] Graceful handling of port conflicts
- [ ] Proper error messages
- [ ] Cleanup on failure
- [ ] Log file accessibility

## Troubleshooting Guide

### Port Already in Use
```bash
# Find and kill process on port
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Original Frontend
lsof -ti:5174 | xargs kill -9  # Seat Classes Frontend
```

### Frontend Not Loading
1. Check if backend is running: `curl http://localhost:8000/flights`
2. Check frontend logs: `tail -f frontend-original.log` or `frontend-classes.log`
3. Verify node_modules installed: `cd booking_system_frontend && npm install`

### Database Issues
1. Delete database: `rm booking_system_backend/booking_system.db`
2. Restart services: `./start.sh`

## Next Steps

1. Review and approve startup script changes
2. Update existing start.sh and start.bat
3. Create helper scripts
4. Update STARTUP_GUIDE.md
5. Test all startup scenarios
6. Update documentation