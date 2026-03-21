# 🚀 Galaxium Travels - Startup Guide

This guide explains how to run the Galaxium Travels application locally using the provided startup scripts.

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

### Required Software

1. **Python 3.8 or higher**
   - Download: https://www.python.org/downloads/
   - Verify installation: `python3 --version` (macOS/Linux) or `python --version` (Windows)

2. **Node.js 18 or higher**
   - Download: https://nodejs.org/
   - Verify installation: `node --version`

3. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## 🎯 Quick Start

### macOS / Linux

1. Open Terminal
2. Navigate to the project directory:
   ```bash
   cd path/to/galaxium-travels
   ```
3. Run the startup script:
   ```bash
   ./start.sh
   ```

### Windows

1. Open Command Prompt or PowerShell
2. Navigate to the project directory:
   ```cmd
   cd path\to\galaxium-travels
   ```
3. Run the startup script:
   ```cmd
   start.bat
   ```

## 📖 What the Scripts Do

The startup scripts automatically:

1. ✅ **Check Prerequisites** - Verify Python, Node.js, and npm are installed
2. ✅ **Setup Backend**
   - Create Python virtual environment (if needed)
   - Install Python dependencies
   - Start FastAPI server on port 8080
3. ✅ **Setup Frontend**
   - Create .env file (if needed)
   - Install Node.js dependencies
   - Start Vite dev server on port 5173
4. ✅ **Display Access URLs** - Show where to access the application

## 🌐 Accessing the Application

Once the scripts complete successfully, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main web application |
| **Backend API** | http://localhost:8080 | REST API endpoints |
| **API Documentation** | http://localhost:8080/docs | Interactive API docs (Swagger) |
| **MCP Endpoint** | http://localhost:8080/mcp | Model Context Protocol endpoint |

## 🛑 Stopping the Application

### macOS / Linux
- Press `Ctrl+C` in the terminal where the script is running
- Both servers will shut down gracefully

### Windows
- Close the backend and frontend command prompt windows
- Or press `Ctrl+C` in each window

## 🔧 Troubleshooting

### Port Already in Use

If you see a warning about ports 8080 or 5173 being in use:

**macOS/Linux:**
```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Windows:**
```cmd
# Find process on port 8080
netstat -ano | findstr :8080

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Python Not Found

**macOS/Linux:**
- Install Python: `brew install python3` (if using Homebrew)
- Or download from: https://www.python.org/downloads/

**Windows:**
- Download installer from: https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation

### Node.js Not Found

**All Platforms:**
- Download and install from: https://nodejs.org/
- Restart your terminal/command prompt after installation

### Virtual Environment Issues

If the Python virtual environment fails to create:

**macOS/Linux:**
```bash
cd booking_system_backend
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows:**
```cmd
cd booking_system_backend
rmdir /s /q .venv
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Frontend Dependencies Issues

If npm install fails:

```bash
cd booking_system_frontend
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s /q node_modules && del package-lock.json  # Windows

npm install
```

### Permission Denied (macOS/Linux)

If you get "Permission denied" when running `./start.sh`:

```bash
chmod +x start.sh
./start.sh
```

## 📝 Log Files

The startup scripts create log files for debugging:

- **backend.log** - Backend server logs
- **frontend.log** - Frontend dev server logs

View logs in real-time:

**macOS/Linux:**
```bash
tail -f backend.log
tail -f frontend.log
```

**Windows:**
```cmd
type backend.log
type frontend.log
```

## 🔄 Manual Start (Alternative)

If the automated scripts don't work, you can start services manually:

### Backend (Terminal 1)
```bash
cd booking_system_backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate.bat
pip install -r requirements.txt
python server.py
```

### Frontend (Terminal 2)
```bash
cd booking_system_frontend
npm install
npm run dev
```

## 🎨 Environment Configuration

### Backend Configuration

The backend uses SQLite by default. No additional configuration needed.

### Frontend Configuration

Create or edit `booking_system_frontend/.env`:

```env
VITE_API_URL=http://localhost:8080
```

Change the URL if your backend runs on a different host/port.

## 🧪 Testing the Installation

After starting the application:

1. **Test Backend:**
   - Open http://localhost:8080/docs
   - You should see the Swagger API documentation

2. **Test Frontend:**
   - Open http://localhost:5173
   - You should see the Galaxium Travels homepage

3. **Test Integration:**
   - Click "Flights" in the navigation
   - You should see a list of available flights

## 📚 Additional Resources

- **Main README:** [README.md](README.md)
- **Backend Documentation:** [booking_system_backend/README.md](booking_system_backend/README.md)
- **Frontend Documentation:** [booking_system_frontend/README.md](booking_system_frontend/README.md)
- **API Reference:** [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 💡 Tips

1. **First Run:** The first time you run the scripts, it will take longer as dependencies are installed
2. **Subsequent Runs:** Later runs will be much faster as dependencies are cached
3. **Development:** Keep both servers running while developing - they support hot reload
4. **Database:** The SQLite database is created automatically with sample data

## 🆘 Getting Help

If you encounter issues:

1. Check the log files (backend.log, frontend.log)
2. Review the troubleshooting section above
3. Ensure all prerequisites are installed correctly
4. Try the manual start method
5. Check that ports 8080 and 5173 are available

---

**Happy Space Traveling! 🚀✨**