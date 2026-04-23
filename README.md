# 🚀 Galaxium Travels - Interplanetary Booking System

A complete full-stack application for booking interplanetary space travel, featuring a modern React frontend and a FastAPI backend with dual REST and MCP protocol support.

## 🌟 Features

- **Modern Space-Themed UI** - Beautiful, responsive interface with animated starfield
- **Full Booking System** - Browse flights, make bookings, manage reservations
- **Three Seat Classes** - Economy, Business, and Galaxium Class with independent availability tracking
- **Dynamic Pricing** - Class-based multipliers (1x, 2.5x, 5x) applied to base flight prices
- **Dual Protocol Backend** - REST API and MCP (Model Context Protocol) support
- **Type-Safe** - Full TypeScript frontend and Python type hints with strict validation
- **Real-Time Updates** - Live seat availability per class and booking status
- **User Management** - Simple name/email authentication
- **Comprehensive Testing** - Full test coverage for services and REST endpoints
- **Production Ready** - Optimized builds and comprehensive error handling

## 🏗️ Architecture

```
galaxium-travels/
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
├── inventory_hold_service/    # Java hold service (Spring Boot)
│   └── src/main/java/        # Java source code
│
├── docs/                      # 📚 All documentation
│   ├── AWS-DEPLOYMENT.md     # AWS deployment guide
│   ├── IBM-CLOUD-DEPLOYMENT.md # IBM Cloud guide
│   └── ...                   # Other docs
│
├── scripts/                   # 🔧 Operational scripts
│   ├── aws/                  # AWS deployment scripts
│   ├── ibm/                  # IBM Cloud scripts
│   └── local/                # Local dev scripts
│
├── terraform/                 # Infrastructure as code
└── AGENTS.md                  # Critical patterns for AI agents
```

### Key Documentation

- **[AGENTS.md](AGENTS.md)** - Critical non-obvious patterns, testing specifics, and architectural constraints
- **[docs/](docs/)** - All documentation (deployment guides, implementation ideas, etc.)
- **[scripts/](scripts/)** - All operational scripts organized by deployment target

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Option 1: One-Command Start (Recommended)

```bash
./deployment_scripts/local/start_locally.sh
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

### Component Documentation
- **Backend**: [booking_system_backend/README.md](booking_system_backend/README.md) - API endpoints, MCP tools, database schema
- **Frontend**: [booking_system_frontend/README.md](booking_system_frontend/README.md) - Components, styling, build instructions
- **Java Service**: [inventory_hold_service/README.md](inventory_hold_service/README.md) - Hold service API and architecture

### Deployment Guides
- **AWS**: [docs/AWS-DEPLOYMENT.md](docs/AWS-DEPLOYMENT.md) - Complete AWS ECS deployment guide
- **IBM Cloud**: [docs/IBM-CLOUD-DEPLOYMENT.md](docs/IBM-CLOUD-DEPLOYMENT.md) - IBM Cloud Code Engine deployment
- **Local**: [docs/QUICK_START.md](docs/QUICK_START.md) - Quick start guide for local development

### Additional Documentation
- **[AGENTS.md](AGENTS.md)** - Critical patterns for AI agents working with this codebase
- **[docs/](docs/)** - All other documentation (implementation ideas, migration plans, etc.)
- **[scripts/](scripts/)** - Operational scripts organized by deployment target

## 🎯 User Guide

### Booking a Flight

1. **Browse Flights** - Navigate to the Flights page to see all available routes
2. **View Seat Classes** - Each flight displays three classes with real-time availability:
   - 🛫 **Economy** - Standard comfort (1x base price)
   - 👑 **Business** - Premium experience (2.5x base price)
   - 🚀 **Galaxium Class** - Ultimate luxury (5x base price)
3. **Check Availability** - Each class shows available seats independently
4. **Select Your Class** - Choose based on availability and budget
5. **Sign In/Register** - Click "Book Now" and enter your name and email
6. **Confirm Booking** - Review flight details, selected class, and final price
7. **Manage Bookings** - View and cancel bookings from "My Bookings" page

### Demo Data

The system comes pre-seeded with:
- **10 Users** - Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Heidi, Ivan, Judy
- **10 Flights** - Routes between Earth, Mars, Moon, Venus, Jupiter, Europa, Pluto
- **Seat Distribution** - Each flight has Economy (60%), Business (30%), Galaxium (10%)
- **20 Sample Bookings** - Distributed across all three seat classes with realistic availability

## 💺 Seat Classes & Pricing

Galaxium Travels offers three distinct seat classes for every flight:

| Class | Icon | Multiplier | Features | Seat Allocation |
|-------|------|------------|----------|-----------------|
| **Economy** | 🛫 | 1.0x | Standard seating, Basic amenities | 60% of seats |
| **Business** | 👑 | 2.5x | Priority boarding, Extra legroom, Premium meals | 30% of seats |
| **Galaxium** | 🚀 | 5.0x | Private pods, Zero-G lounge, Gourmet dining, Concierge | 10% of seats |

### Pricing Example
For a flight with base price of $1,000,000:
- Economy: $1,000,000
- Business: $2,500,000
- Galaxium Class: $5,000,000

### Seat Availability
- **Independent Tracking** - Each class has separate available/booked counters
- **Real-Time Updates** - Availability updates immediately after booking/cancellation
- **Sold Out Handling** - Classes show "Sold Out" when no seats remain, other classes stay bookable
- **Database Integrity** - Seat counters stored in Flight model, updated via service layer

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

## 🧪 Testing

### Backend Tests
```bash
cd booking_system_backend
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest tests/test_services.py   # Service layer tests
pytest tests/test_rest.py       # REST API tests
```

**Test Coverage:**
- Service layer functions (booking, flight, user operations)
- REST API endpoints
- Seat class validation and availability
- Error handling and edge cases

### Frontend Build Test
```bash
cd booking_system_frontend
npm run build                   # Production build
npm run lint                    # Code quality check
```

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

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Check if port 5173 is available
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Connection Issues
- Verify backend is running on http://localhost:8080
- Check CORS settings in backend
- Ensure `.env` file exists in frontend with correct API URL

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

## 💡 Consolidated Implementation Ideas

This section collects and consolidates feature ideas that were originally generated in parallel by different AI agents during exploration and brainstorming. Rather than treating them as a strict product roadmap, think of them as a curated backlog of promising directions for evolving the demo.

It sits at the end of [`README.md`](README.md) intentionally: the main body of the README explains what the project already is, while this final section captures what it could become next. That keeps the core documentation focused on the current system, while still preserving a clear, high-signal set of future enhancements for demos, planning, and experimentation.

The ideas below consolidate overlapping suggestions into a single, demo-focused roadmap. They prioritize features that make the system more visually impressive while also highlighting enterprise architecture, agentic workflows, and operational realism.

### 1. AI Travel Agent Copilot
Add an in-app assistant that helps users search flights, compare tradeoffs, complete bookings, explain prices, rebook disrupted trips, and summarize itineraries using the existing MCP tooling.

- **Why it matters:** This is the most compelling showcase of an AI-native IDE building AI-powered product functionality.
- **What it demonstrates:** MCP tool calling, conversational workflows, confirmation steps, auditability, action traces, and agent orchestration.
- **Possible UX:** Slide-out chat panel, streaming responses, rich flight cards, inline booking actions, and visible tool execution history.

### 2. Mission Control and Real-Time Operations Center
Create a live operations dashboard for flights across the solar system, showing departures, arrivals, booking velocity, cancellations, seat burn-down, and service alerts.

- **Why it matters:** It gives the demo an instantly recognizable enterprise command-center feel.
- **What it demonstrates:** WebSockets or SSE, async backend workflows, background jobs, telemetry, operational monitoring, and role-based admin experiences.
- **Possible UX:** Split-flap flight boards, animated KPI panels, route activity indicators, and system health widgets.

### 3. Interactive Solar System Route Intelligence Map
Build an interactive map of the solar system with planets, routes, popularity, delay risk, and price bands. Users can filter and book directly from the visualization.

- **Why it matters:** This is likely the most visually memorable frontend enhancement.
- **What it demonstrates:** Advanced visualization, state-driven UI, animation performance, data transformation, and rich interaction design.
- **Possible UX:** Animated orbital routes, glowing planets, route heatmaps, and active-booking particle trails.

### 4. Seat Selection, Holds, and Concurrency Safety
Expand booking with a spacecraft seat map, temporary seat holds, checkout timers, idempotent booking APIs, and conflict-aware inventory updates.

- **Why it matters:** It solves one of the classic enterprise reliability problems while making booking more interactive.
- **What it demonstrates:** Transaction safety, optimistic locking, retries, inventory consistency, and graceful conflict resolution.
- **Possible UX:** Visual seat maps, hold countdowns, real-time seat release, and “seat just taken” recovery suggestions.

### 5. Booking Wizard and Digital Boarding Pass
Replace the simple booking flow with a multi-step journey for class selection, seat choice, extras, review, and confirmation, ending with a downloadable boarding pass.

- **Why it matters:** It turns the core conversion flow into a polished, demo-worthy customer experience.
- **What it demonstrates:** Form orchestration, validation, pricing logic, transaction boundaries, QR generation, and document creation.
- **Possible UX:** Step transitions, add-on pricing, animated confirmation states, and a premium space-themed boarding pass.

### 6. Disruption Management and Auto-Rebooking
Introduce delays, cancellations, missed connections, and alternate-flight recommendations, with one-click rebooking for travelers and support staff.

- **Why it matters:** It makes the system feel operationally realistic instead of just transactional.
- **What it demonstrates:** Rules engines, dependency handling, exception flows, timeline state changes, and AI-assisted recovery workflows.
- **Possible UX:** Alert banners, trip timeline changes, alternate-route cards, and recovery recommendations.

### 7. Enterprise Authentication, Roles, and Support Workspace
Evolve the simple name/email flow into enterprise auth with roles such as traveler, support agent, finance reviewer, and operations admin, plus a back-office support console.

- **Why it matters:** It makes the application feel like a real business system instead of a consumer-only demo.
- **What it demonstrates:** SSO or JWT-based auth, RBAC, protected routes, permission-aware controls, admin tooling, and safe operational actions.
- **Possible UX:** Org-aware navigation, protected admin pages, customer lookup tools, refund/rebooking controls, and support case notes.

### 8. Multi-Tenant Corporate Travel Portal
Allow one company to manage employees, budgets, travel policies, approval chains, and cost centers within isolated tenant boundaries.

- **Why it matters:** This is a strong enterprise differentiator and naturally expands the domain.
- **What it demonstrates:** Tenant scoping, policy enforcement, approval workflows, administrative dashboards, and scoped analytics.
- **Possible UX:** Company dashboards, traveler directories, approval queues, budget views, and policy alerts.

### 9. Dynamic Pricing, Forecasting, and Loyalty
Evolve pricing from static multipliers into a demand-aware pricing engine, and pair it with price history, alerts, and a loyalty program with tiered rewards.

- **Why it matters:** It adds richer business logic and gives users a stronger sense of a living commercial system.
- **What it demonstrates:** Pricing algorithms, scheduled jobs, simulation logic, time-series data, perk calculation, and progression systems.
- **Possible UX:** Sparklines on flight cards, “price rising” signals, drop alerts, loyalty tiers, and reward progress indicators.

### 10. Payments, Refunds, and Finance Ledger
Introduce checkout, payment authorization, refund workflows, invoices, and finance reporting.

- **Why it matters:** It completes the commercial lifecycle and creates realistic back-office finance scenarios.
- **What it demonstrates:** Idempotency, provider integrations, reconciliation, financial state machines, and reporting workflows.
- **Possible UX:** Checkout states, refund timelines, invoice downloads, payment status chips, and finance views.

### 11. Observability, Audit Trail, and Health Operations
Add structured logging, correlation IDs, tracing, health checks, and an internal audit explorer for bookings, cancellations, policy decisions, and administrative actions.

- **Why it matters:** This is a major enterprise credibility layer, especially in live demos.
- **What it demonstrates:** OpenTelemetry patterns, structured logs, traceability, compliance-oriented design, and production diagnostics.
- **Possible UX:** Searchable audit feed, trace-linked actions, JSON log viewer, and system readiness panels.

### 12. Quality, Globalization, and Demo Readiness
Improve enterprise polish with end-to-end tests, CI pipelines, internationalization, and multi-currency support.

- **Why it matters:** These features are less flashy individually, but they strongly reinforce production-readiness.
- **What it demonstrates:** Automated quality gates, deployment confidence, localization pipelines, locale-aware formatting, and broader market readiness.
- **Possible UX:** Language picker, localized prices and dates, CI badges, and stable end-to-end demo flows.

## 🎯 Suggested Demo-First Priority

For the strongest blend of visual impact, technical depth, and “enterprise AI” storytelling, prioritize:

1. **AI Travel Agent Copilot**
2. **Mission Control and Real-Time Operations Center**
3. **Interactive Solar System Route Intelligence Map**
4. **Seat Selection, Holds, and Concurrency Safety**
5. **Disruption Management and Auto-Rebooking**