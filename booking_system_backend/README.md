# Galaxium Booking System — Backend

A unified booking backend for Galaxium Travels that serves both **REST API** and **MCP (Model Context Protocol)** from a single server.

## Features

- **Dual Protocol Support**: Same business logic exposed via REST and MCP
- **Single Server**: One codebase, one port (`8080`), both protocols
- **SQLite Database**: Simple file-based storage for demos
- **Demo Data**: Pre-seeded with space travel flights and users

## Quick Start

### Install Dependencies

```bash
cd booking_system_backend
pip install -r requirements.txt
```

### Run the Server

```bash
python server.py
```

The server starts on port **8080** with:
- REST endpoints at root paths (e.g. `/flights`, `/book`)
- MCP tools at `/mcp`
- Swagger UI at `/docs`
- Health check at `/`

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/flights` | List all available flights |
| POST | `/book` | Book a flight |
| GET | `/bookings/{user_id}` | Get user's bookings |
| POST | `/cancel/{booking_id}` | Cancel a booking |
| POST | `/register` | Register a new user |
| GET | `/user?name=...&email=...` | Get user by name and email |

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_flights` | List all available flights |
| `book_flight` | Book a seat on a flight |
| `get_bookings` | Get user's bookings |
| `cancel_booking` | Cancel a booking |
| `register_user` | Register a new user |
| `get_user_id` | Get user by name and email |

## Usage Examples

### REST API

```bash
# List flights
curl http://localhost:8080/flights

# Register a user
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Book a flight
curl -X POST http://localhost:8080/book \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "name": "Alice", "flight_id": 1}'

# Get bookings
curl http://localhost:8080/bookings/1

# Cancel a booking
curl -X POST http://localhost:8080/cancel/1
```

### MCP (with Claude Code or MCP Inspector)

Connect to `http://localhost:8080/mcp` and use the available tools:

```
list_flights()
register_user(name="John Doe", email="john@example.com")
book_flight(user_id=1, name="Alice", flight_id=1)
get_bookings(user_id=1)
cancel_booking(booking_id=1)
```

## Testing

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_services.py
pytest tests/test_rest.py

# Run with coverage
pytest --cov
```

## Project Structure

```
booking_system_backend/
├── server.py          # Main server - exposes REST & MCP
├── services/          # Business logic layer
│   ├── booking.py     # Booking operations
│   ├── flight.py      # Flight operations
│   └── user.py        # User operations
├── models.py          # SQLAlchemy ORM models
├── schemas.py         # Pydantic request/response schemas
├── db.py              # Database configuration
├── seed.py            # Demo data seeding
├── tests/             # Test suite
│   ├── test_services.py
│   └── test_rest.py
├── requirements.txt
├── Dockerfile
└── pytest.ini
```

## Demo Data

The server wipes and re-seeds the database on every startup with:
- **10 users**: Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Heidi, Ivan, Judy
- **10 flights**: Interplanetary routes (Earth, Mars, Moon, Venus, Jupiter, Europa, Pluto)
- **20 bookings**: Random bookings across users and flights with statuses: `booked`, `cancelled`, `completed`

> **Note:** Seeded IDs are not stable across restarts — do not hard-code them.

## Docker

```bash
# Build
docker build -t galaxium-booking .

# Run
docker run -p 8080:8080 galaxium-booking
```

## Architecture

The system uses a **service layer** pattern:

1. **Services** (`services/`) — Pure business logic functions; return `SuccessSchema | ErrorResponse` (never raise)
2. **Server** (`server.py`) — Thin wrappers exposing services via REST (FastAPI) and MCP (FastMCP)
3. **Models** (`models.py`) — SQLAlchemy ORM definitions
4. **Schemas** (`schemas.py`) — Pydantic v2 validation schemas (`model_validate`, `from_attributes = True`)

This architecture ensures:
- Business logic is tested independently of the transport layer
- Same validation and error handling for both REST and MCP
- Easy to add new transport layers (GraphQL, gRPC, etc.)
