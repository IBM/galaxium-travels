# 🚀 Galaxium Travels - Interplanetary Booking System

A complete full-stack application for booking interplanetary space travel, featuring a modern React frontend and a FastAPI backend with dual REST and MCP protocol support.

## 🌟 Features

- **Modern Space-Themed UI** - Beautiful, responsive interface with animated starfield
- **Full Booking System** - Browse flights, make bookings, manage reservations
- **Dual Protocol Backend** - REST API and MCP (Model Context Protocol) support
- **Type-Safe** - Full TypeScript frontend and Python type hints
- **Real-Time Updates** - Live flight availability and booking status
- **User Management** - Simple name/email authentication
- **Production Ready** - Optimized builds and comprehensive error handling

## 🏗️ Architecture

```
galaxium-travels/
├── booking_system_backend/     # FastAPI backend (Python)
│   ├── server.py              # Main server with REST & MCP
│   ├── services/              # Business logic layer
│   │   ├── booking.py
│   │   ├── flight.py
│   │   └── user.py
│   ├── models.py              # SQLAlchemy ORM models
│   ├── schemas.py             # Pydantic schemas
│   ├── db.py                  # Database session setup
│   ├── seed.py                # Demo data seeder
│   └── tests/                 # Test suite
│
├── booking_system_frontend/    # React frontend (TypeScript)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API integration
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Utility helpers
│   └── dist/                  # Production build
│
└── start.sh                   # Unix/macOS startup script
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Option 1: One-Command Start (Recommended)

#### On macOS/Linux:
```bash
./start.sh
```

This will automatically:
- ✅ Install all dependencies
- ✅ Start the backend server on port 8080
- ✅ Start the frontend dev server on port 5173

### Option 2: Manual Start

#### Start Backend:
```bash
cd booking_system_backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

#### Start Frontend (in a new terminal):
```bash
cd booking_system_frontend
npm install
npm run dev
```

## 🌐 Access the Application

Once started, access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/docs
- **MCP Endpoint**: http://localhost:8080/mcp

## 📚 Documentation

### Backend
See [booking_system_backend/README.md](booking_system_backend/README.md) for:
- API endpoints documentation
- MCP tools reference
- Database schema
- Testing instructions

### Frontend
See [booking_system_frontend/README.md](booking_system_frontend/README.md) for:
- Component documentation
- Styling guide
- Build instructions
- Deployment options

## 🎯 User Guide

### Booking a Flight

1. **Browse Flights** - Navigate to the Flights page to see all available routes
2. **Search & Filter** - Use the search bar to find specific destinations
3. **Sign In/Register** - Click "Book Now" and enter your name and email
4. **Confirm Booking** - Review flight details and confirm your reservation
5. **Manage Bookings** - View and cancel bookings from "My Bookings" page

### Demo Data

The system comes pre-seeded with:
- **10 Users** - Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Heidi, Ivan, Judy
- **10 Flights** - Routes between Earth, Mars, Moon, Venus, Jupiter, Europa, Pluto
- **20 Sample Bookings** - Various booking statuses (booked, cancelled, completed)

> **Note:** Demo data is wiped and re-seeded on every server restart — do not rely on seeded IDs being stable across restarts.

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **FastMCP** - MCP protocol support
- **SQLite** - Lightweight database
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router v7** - Routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **clsx** - Conditional class names

## 🧪 Testing

### Backend Tests
```bash
cd booking_system_backend
pytest                          # Run all tests
pytest tests/test_rest.py       # Run a single test file
pytest --cov                    # Tests with coverage
```

### Frontend Build Check
```bash
cd booking_system_frontend
npm run build   # Type-check then bundle
npm run lint    # ESLint on all .ts/.tsx files
```

## 📦 Production Deployment

### Backend
```bash
cd booking_system_backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8080
```

The backend includes a `Dockerfile` for containerized deployment.

### Frontend
```bash
cd booking_system_frontend
npm run build
# Deploy the 'dist' folder to your hosting service
```

## 🎨 Customization

### Change API URL
Copy `.env.example` to `.env` and edit `booking_system_frontend/.env`:
```env
VITE_API_URL=https://your-api-url.com
```

### Theme Colors
All custom colors are defined in `booking_system_frontend/tailwind.config.js`:
```js
colors: {
  'space-dark':     '#030712',
  'space-blue':     '#0A1929',
  'cosmic-purple':  '#6366F1',
  'nebula-pink':    '#EC4899',
  'alien-green':    '#10B981',
  'solar-orange':   '#F59E0B',
  'star-white':     '#F9FAFB',
}
```
Use these tokens in components rather than raw hex values.

## 🐛 Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed: `python --version`
- Check if port 8080 is available
- Verify all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Check if port 5173 is available
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Connection Issues
- Verify backend is running on http://localhost:8080
- Check CORS settings in backend
- Ensure `.env` file exists in frontend with correct API URL (copy from `.env.example`)

## 📄 License

This project is part of the Galaxium Travels booking system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues or questions:
- Check the documentation in each component's README
- Review the troubleshooting section above
- Open an issue on GitHub

---

**Built with ❤️ for space travelers** 🚀✨

*Explore the cosmos, one booking at a time!*
