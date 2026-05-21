# 🚀 Galaxium Travels - Interplanetary Booking System

A complete full-stack application for booking interplanetary space travel, featuring a modern React frontend and a FastAPI backend with dual REST and MCP protocol support.

## 🌟 Features

- **Modern Space-Themed UI** - Beautiful, responsive interface with animated starfield
- **Full Booking System** - Browse flights, make bookings, manage reservations
- **Infant Booking Support** - Book flights with infants (under 2 years, no seat required) ✨ NEW
- **Modify Bookings** - Edit existing bookings to change passenger details ✨ NEW
- **Enhanced Passenger Management** - Track passenger names and details ✨ NEW
- **Dual Protocol Backend** - REST API and MCP (Model Context Protocol) support
- **Type-Safe** - Full TypeScript frontend and Python type hints
- **Real-Time Updates** - Live flight availability and booking status
- **User Management** - Simple name/email authentication
- **Production Ready** - Optimized builds and comprehensive error handling

## 🆕 What's New

This project has been enhanced with three major features as part of the Bob learning path case study:

1. **🍼 Infant Booking** - Book flights with infants who travel on lap (no seat needed)
2. **✏️ Modify Bookings** - Edit existing bookings to change passenger counts and details
3. **👥 Passenger Management** - Track and display detailed passenger information

See [FEATURES_ADDED.md](FEATURES_ADDED.md) for detailed documentation of new features.

## 🏗️ Architecture

```
galaxium-travels-infrastructure/
├── booking_system_backend/     # FastAPI backend (Python)
│   ├── server.py              # Main server with REST & MCP
│   ├── services/              # Business logic layer
│   ├── models.py              # SQLAlchemy ORM models
│   └── tests/                 # Test suite
│
├── booking_system_frontend/    # React frontend (TypeScript)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── services/         # API integration
│   │   └── types/            # TypeScript definitions
│   └── dist/                 # Production build
│
├── FEATURES_ADDED.md          # New features documentation
├── start.sh                   # Unix/Mac startup script
└── start.bat                  # Windows startup script
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

#### On Windows:
```bash
start.bat
```

This will automatically:
- ✅ Install all dependencies
- ✅ Start the backend server on port 8080
- ✅ Start the frontend dev server on port 5173
- ✅ Open both in separate terminal windows

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

### New Features
See [FEATURES_ADDED.md](FEATURES_ADDED.md) for:
- Infant booking feature details
- Modify booking functionality
- Enhanced passenger management
- API usage examples
- Testing guidelines

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
4. **Specify Passengers** - Enter number of adults and infants (NEW!)
5. **Add Passenger Names** - Optionally add passenger names (NEW!)
6. **Confirm Booking** - Review flight details and confirm your reservation
7. **Manage Bookings** - View, edit, and cancel bookings from "My Bookings" page

### Modifying a Booking (NEW!)

1. **Go to My Bookings** - Navigate to your bookings page
2. **Click Edit** - Click the "Edit" button on any active booking
3. **Update Details** - Change number of adults, infants, or passenger names
4. **Save Changes** - Confirm your modifications

### Demo Data

The system comes pre-seeded with:
- **10 Users** - Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Heidi, Ivan, Judy
- **10 Flights** - Routes between Earth, Mars, Moon, Venus, Jupiter, Europa, Pluto
- **20 Sample Bookings** - Various booking statuses with different passenger configurations

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **FastMCP** - MCP protocol support
- **SQLite** - Lightweight database
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icon library

## 🧪 Testing

### Backend Tests
```bash
cd booking_system_backend
pytest -v
```

### Frontend Build Test
```bash
cd booking_system_frontend
npm run build
```

### Manual Testing
See [FEATURES_ADDED.md](FEATURES_ADDED.md) for comprehensive testing checklist.

## 📦 Production Deployment

### Backend
```bash
cd booking_system_backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8080
```

### Frontend
```bash
cd booking_system_frontend
npm run build
# Deploy the 'dist' folder to your hosting service
```

### Docker Support
Both backend and frontend include Dockerfiles for containerized deployment.

## 🎨 Customization

### Change API URL
Edit `booking_system_frontend/.env`:
```env
VITE_API_URL=https://your-api-url.com
```

### Modify Theme Colors
Edit `booking_system_frontend/tailwind.config.js`:
```js
colors: {
  'cosmic-purple': '#6366F1',
  'nebula-pink': '#EC4899',
  // Add your colors
}
```

## 🐛 Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed: `python --version`
- Check if port 8080 is available
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Delete the database file and restart to reset: `rm booking_system.db`

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Check if port 5173 is available
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Connection Issues
- Verify backend is running on http://localhost:8080
- Check CORS settings in backend
- Ensure `.env` file exists in frontend with correct API URL

### Database Issues
- If you encounter database errors after updates, delete `booking_system.db` and restart
- The database will be recreated with the new schema automatically

## 🎓 Learning Path

This project was enhanced as part of the Bob AI Assistant learning path case study. Key learning outcomes:

- ✅ Full-stack feature development
- ✅ Database schema evolution
- ✅ API design and implementation
- ✅ Frontend component development
- ✅ State management and form handling
- ✅ User experience design
- ✅ Testing and validation
- ✅ Documentation and code organization

## 📄 License

This project is part of the Galaxium Travels booking system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Update documentation
6. Submit a pull request

## 📧 Support

For issues or questions:
- Check the documentation in each component's README
- Review [FEATURES_ADDED.md](FEATURES_ADDED.md) for new features
- Review the troubleshooting section above
- Open an issue on GitHub

---

**Built with ❤️ for space travelers using Bob AI Assistant** 🚀✨🤖

*Explore the cosmos, one booking at a time!*

## 🙏 Acknowledgments

- Built with [Bob AI Assistant](https://bob.ibm.com) - IBM's AI-powered development tool
- Part of the Bob-a-thon learning path case study
- Enhanced with infant booking and modify booking features