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
├── AGENTS.md                  # Critical patterns for AI agents
└── start.sh                   # Quick start script
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

## 💡 Product Backlog

This is the active backlog for evolving Galaxium Travels from a thin demo into something that feels like a real travel product. It sits at the end of the README on purpose: the rest of the document describes what exists today; this section describes what should exist next.

Items are derived from a gap analysis against what any modern travel site (Expedia, Delta, Kayak, Airbnb) already does. The current app has four surfaces — Home, Flights, booking modal, My Bookings — and most of the items below start by filling a hole any experienced traveler would expect to find in one of them.

Each entry is kept short but includes what's needed to actually pick it up:

- **Gap** — what's missing today that a real user expects
- **Scope** — what ships in the first cut; explicit out-of-scope guardrails where relevant
- **Touches** — primary files or areas affected
- **Size** — rough estimate at demo pace

---

### Tier 1 — "How is this missing?" features

The most glaring omissions. Anyone who has booked a flight online will notice their absence the first time they click around.

#### 1. Flight detail page (`/flights/:id`)
Make flight cards clickable. The detail page has a route header, ship info, per-class amenities grid, baggage and cancellation policies, and a mission timeline (launch → transfer burn → orbital insertion → landing) with a prominent "Book this flight" CTA.

- **Gap:** Cards aren't clickable today. There is nowhere for amenities, policies, or any richer flight context to live.
- **Scope:** New route + page. Amenities and policies live as static config keyed by class. Mission-timeline milestones computed from `departure_time` and `arrival_time`. Out of scope: editable content, per-flight overrides.
- **Touches:** new `booking_system_frontend/src/pages/FlightDetail.tsx`, router in `App.tsx`, link from `FlightCard.tsx`; optional ship/aircraft fields in `booking_system_backend/models.py`.
- **Size:** ~2–3 hours.

#### 2. "My Trip" detail page (`/bookings/:id`)
Clicking a booking in My Bookings opens the full itinerary: passenger list, seat numbers, a prominently displayed booking reference, a QR code, "Add to calendar," and a refund breakdown.

- **Gap:** Booking cards aren't clickable. The `externalBookingReference` from the hold service is shown in a toast and then lost. There's no single place that represents the trip itself.
- **Scope:** New route + page. QR encodes the trip URL. `.ics` download deferred to #20.
- **Touches:** new `pages/TripDetail.tsx`, link from `BookingCard.tsx`, backend `GET /bookings/{id}` (verify or add), reuse existing user/flight endpoints.
- **Size:** ~2–3 hours.

#### 3. Real passenger details in booking flow
Add a "Passenger details" step to the booking modal: full legal name, DOB, passport/ID number, contact phone, emergency contact, dietary preference.

- **Gap:** Every booking today carries only `user.name` and `user.email`. A multi-million-credit interplanetary flight with no ID collection feels wrong the moment anyone looks at the flow.
- **Scope:** New step between "select class" and "quote." Stored on the booking as a `passenger_details` JSON column (or new `Passenger` table — see #4). No verification against a real ID provider. Required fields validated client-side.
- **Touches:** `components/bookings/BookingModal.tsx` (new step), `models.py`, `services/booking.py`, schema seeding.
- **Size:** ~2 hours.

#### 4. Multi-passenger booking
Expose the hold service's existing `quantity` field. "Add passenger" in the modal adds another passenger-details form; the price total updates live; one booking covers up to 6 passengers.

- **Gap:** Users can only book one seat at a time. No family trips, no group travel. The backend hold service already accepts a quantity — the frontend just doesn't use it.
- **Scope:** Up to 6 passengers per booking, all in the same class. Mixed-class bookings out of scope. Seat assignment per passenger deferred to #6.
- **Touches:** `BookingModal.tsx`, `services/booking.py` (one booking → N `Passenger` rows), hold-service quote call in `services/api.ts` (`quantity` wire-through), `models.py` (`Passenger` table).
- **Size:** ~3 hours (builds on #3).

#### 5. Mock payment step
A credit-card form at the end of the booking flow with Luhn check, expiry and CVV validation, and a billing ZIP. Fake "Processing…" spinner, fake authorization code, store last-4 and card brand on the booking.

- **Gap:** Users currently click "Confirm Booking" and own a reservation. There is no payment step at all — the single most jarring omission for a new user.
- **Scope:** Client-side validation plus a backend `POST /payments/authorize` stub that always succeeds after a 1–2s delay. No real PSP integration, no 3DS, no saved cards.
- **Touches:** new `components/bookings/PaymentStep.tsx`, new `services/payment.py` stub, booking model gets `payment_last4`, `payment_brand`, `payment_auth_code`, `paid_at`.
- **Size:** ~2–3 hours.

---

### Tier 2 — Signature travel-site features

Each is a recognizable airline-app moment. Together they move the app from "demo" to "this is clearly a real product."

#### 6. Seat selection map
A 2D cabin layout for the selected class. Click to pick a seat; taken seats disabled; the chosen seat stored on the booking.

- **Gap:** Users pick a *class* today, not a *seat*. Every airline app has a seat picker, and it's one of the most recognizable interactions in the category.
- **Scope:** Per-class cabin layouts defined as static config (rows × cols). First cut: one passenger = one seat. Multi-passenger seat picks are a follow-up.
- **Touches:** new `components/bookings/SeatMap.tsx`, `seat_number` column on `Booking` (or per-passenger seat), `services/booking.py` (validate seat not already taken for that flight/class).
- **Size:** ~3 hours.

#### 7. Galaxium Miles loyalty program
A profile page showing tier (Meteor → Comet → Nova → Nebula), miles balance, next-tier progress bar, and a ledger of per-booking earnings. Each confirmed booking earns miles proportional to distance × class multiplier.

- **Gap:** There is no profile page, no loyalty program, no reason to come back. Every real airline has this and it's a core part of what makes travel apps feel commercial.
- **Scope:** Compute miles on booking confirm; seed tier thresholds in code; show tier badge in header. Out of scope: redemption, partner programs, status match.
- **Touches:** new `pages/Profile.tsx`, `models.py` (`miles_ledger` table), `services/booking.py` (emit ledger entry on confirm), `components/layout/Header.tsx` (tier badge + link).
- **Size:** ~3 hours.

#### 8. Destination detail pages (`/destinations/:slug`)
Per-planet/moon page with facts (gravity, orbital distance, typical transit time), hazards, a small gallery, and a "flights departing soon" list.

- **Gap:** The app sells trips to Jupiter and tells you literally nothing about Jupiter. Every travel site has destination content.
- **Scope:** Static content file keyed by destination name. Upcoming flights queried from the existing list endpoint with a destination filter. No user-generated content, no maps.
- **Touches:** new `pages/DestinationDetail.tsx`, `data/destinations.ts`, router in `App.tsx`, featured-destinations row on `Home.tsx`.
- **Size:** ~2 hours.

#### 9. Checkout add-ons
An "Extras" step before payment: extra baggage, gourmet meals, Wi-Fi, travel insurance, zero-G session. Each priced; total updates live.

- **Gap:** Real travel-site checkout is 70% upsell. Ours is 0%.
- **Scope:** Static add-on catalog with fixed prices. Selections stored as a JSON column on the booking. First cut: add-ons apply to the whole booking, not per passenger.
- **Touches:** new `components/bookings/AddOnsStep.tsx`, `data/addOns.ts`, `models.py` (`addons` JSON column), booking total calculation on both backend and frontend.
- **Size:** ~2 hours.

#### 10. Boarding pass / e-ticket
A styled boarding pass shown as the final step of booking and as a permanent link from the My Trip page: passenger name, flight, seat, pod/gate, QR code, barcode strip.

- **Gap:** The confirmation today is a transient toast. There is no artifact to screenshot, download, or keep.
- **Scope:** In-browser HTML view with print styling. PDF export is a nice-to-have follow-up.
- **Touches:** new `pages/BoardingPass.tsx` (or modal variant), `utils/qr.ts`, data already available from #2.
- **Size:** ~2 hours.

---

### Tier 3 — Flavor

Smaller items that add personality or polish. Each is fast and roughly independent.

- **11. Homepage search widget** — From/To/When/Passengers on the hero; deep-links to `/flights?...`. Updates `Home.tsx` and the filter-parsing in `Flights.tsx`. ~1h.
- **12. Flight status chip** — "On time / Boarding / Departed / Delayed" derived from `departure_time` vs. now; shown on flight cards and booking cards. Pure frontend. ~1h.
- **13. Saved flights / wishlist** — heart icon on cards; new "Saved" tab. Store IDs in `localStorage` first; promote to a `user_saved_flights` table later. ~1h.
- **14. Reviews & ratings** — 5-star ratings + comments on flight detail pages (#1). New `reviews` table; seed demo reviews. ~1.5h.
- **15. Destination conditions widget** — solar flare index, dust-storm forecast, orbital debris risk on destination and flight detail pages; mocked data with a daily seed. ~1h.
- **16. Price alerts** — "Notify me if this drops below X" button on flight detail; stored server-side, listed in profile. No real notifications in the first cut. ~1.5h.
- **17. Check-in flow** — becomes available 24h before departure; issues the boarding pass from #10 and flips the booking to `CHECKED_IN`. ~2h.
- **18. Promo codes** — input field at checkout; backend validates against a small code table (`SPACE20` → 20% off). ~1h.
- **19. Refund preview on cancel** — the cancel modal shows "$X refund, $Y fee, $Z kept as travel credit" before confirming, with real cancellation-policy wording. ~1h.
- **20. Calendar export (`.ics`)** — `GET /bookings/{id}.ics` endpoint + "Add to calendar" button on the trip detail page from #2. ~1h.

---

### Suggested build order

For a cohesive arc where each step visibly builds on the previous:

1. **Flight detail page** (#1) — establishes the missing surface area.
2. **Passenger details + multi-passenger** (#3, #4) — fixes the weirdest part of the current flow.
3. **Mock payment + boarding pass** (#5, #10) — closes the commercial loop.
4. **Seat selection map** (#6) — the classic airline moment.
5. **Loyalty program** (#7) — the "this is a real product" moment.

Everything else in Tier 2 and Tier 3 slots in naturally once those five are in place.