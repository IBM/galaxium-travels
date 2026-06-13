# Galaxium Booking System Backend

A unified booking system for Galaxium Travels that serves both **REST API** and **MCP (Model Context Protocol)** from a single server.

## Features

- **Dual Protocol Support**: Same business logic exposed via REST and MCP
- **Single Server**: One codebase, one port (8080), both protocols
- **Three Seat Classes**: Economy, Business, Galaxium with independent availability tracking
- **Dynamic Pricing**: Class-based multipliers (1x, 2.5x, 5x) applied to base prices
- **Service Layer Architecture**: Pure business logic separated from transport layer
- **Type-Safe**: Full Python type hints with Pydantic validation
- **SQLite Database**: Simple file-based storage for demos
- **Comprehensive Testing**: pytest suite with service and REST endpoint coverage
- **Demo Data**: Pre-seeded with space travel flights and users

## Quick Start

### Install Dependencies

```bash
cd booking_system
pip install -r requirements.txt
```

### Run the Server

```bash
python server.py
```

The server starts on port **8001** with:
- REST endpoints at the root path
- MCP tools at `/mcp`
- Health check at `/`

## API Reference

### REST Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/` | Health check | - |
| GET | `/flights` | List all available flights with seat class availability | - |
| POST | `/book` | Book a flight with specific seat class | `{user_id, name, flight_id, seat_class}` |
| GET | `/bookings/{user_id}` | Get user's bookings | - |
| POST | `/cancel/{booking_id}` | Cancel a booking (restores seat availability) | - |
| POST | `/register` | Register a new user | `{name, email}` |
| GET | `/user?name=...&email=...` | Get user by name and email | - |

**Seat Class Parameter**: Must be one of `"economy"`, `"business"`, or `"galaxium"` (case-sensitive)

### MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_flights` | List all available flights with seat availability | - |
| `book_flight` | Book a seat on a flight | `user_id, name, flight_id, seat_class` |
| `get_bookings` | Get user's bookings | `user_id` |
| `cancel_booking` | Cancel a booking | `booking_id` |
| `register_user` | Register a new user | `name, email` |
| `get_user_id` | Get user by name and email | `name, email` |

## Usage Examples

### REST API

```bash
# List flights
curl http://localhost:8001/flights

# Register a user
curl -X POST http://localhost:8001/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Book a flight (with seat class)
curl -X POST http://localhost:8001/book \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "name": "Alice", "flight_id": 1, "seat_class": "economy"}'

# Get bookings
curl http://localhost:8001/bookings/1

# Cancel a booking
curl -X POST http://localhost:8001/cancel/1
```

### MCP (with Claude Code or MCP Inspector)

Connect to `http://localhost:8001/mcp` and use the available tools:

```
list_flights()
register_user(name="John Doe", email="john@example.com")
book_flight(user_id=1, name="Alice", flight_id=1, seat_class="business")
get_bookings(user_id=1)
cancel_booking(booking_id=1)
```

**Note**: MCP tools must manually manage database sessions using `SessionLocal()` with try/finally blocks.

## Testing

**Important**: Tests must be run from the `booking_system_backend` directory.

```bash
# Run all tests
pytest

# Run with verbose output (default via pytest.ini)
pytest -v

# Run specific test file
pytest tests/test_services.py   # Service layer tests
pytest tests/test_rest.py       # REST API endpoint tests

# Run with coverage
pytest --cov=services --cov=server
```

### Test Coverage

- **Service Layer Tests** (`test_services.py`):
  - Flight listing with seat availability
  - Booking creation with seat class validation
  - Seat counter updates (economy, business, galaxium)
  - Booking cancellation and seat restoration
  - User registration and retrieval
  - Error handling (invalid seat class, sold out, etc.)

- **REST API Tests** (`test_rest.py`):
  - All REST endpoints
  - Request/response validation
  - Error responses
  - Integration with service layer

## Project Structure

```
booking_system/
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

The server automatically seeds the database on startup with:
- **10 users**: Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Heidi, Ivan, Judy
- **10 flights**: Interplanetary routes (Earth, Mars, Moon, Venus, Jupiter, Europa, Pluto)
- **Seat Distribution**: Each flight has Economy (60%), Business (30%), Galaxium (10%)
- **20 bookings**: Random bookings distributed across all three seat classes

### Seat Class Distribution
For a flight with 100 total seats:
- Economy: 60 seats (60%)
- Business: 30 seats (30%)
- Galaxium: 10 seats (10%)
## Docker

```bash
# Build
docker build -t galaxium-booking .

# Run
docker run -p 8080:8080 galaxium-booking
```

## Architecture

The system uses a **service layer** pattern:

1. **Services** (`services/`) - Pure business logic functions that return Union types
2. **Server** (`server.py`) - Thin wrappers exposing services via REST and MCP
3. **Models** (`models.py`) - SQLAlchemy ORM definitions with seat class counters
4. **Schemas** (`schemas.py`) - Pydantic validation schemas with Literal types

### Key Design Patterns

- **Union Return Types**: All service functions return `ModelOut | ErrorResponse`, never raise exceptions
- **Email Normalization**: All email addresses are automatically converted to lowercase for case-insensitive lookups
- **Manual Session Management**: MCP tools use `SessionLocal()` directly with try/finally blocks
- **Hardcoded Multipliers**: Seat class multipliers defined in `booking.py:8-12` (not configurable)
- **Integer Pricing**: `int(base_price * multiplier)`, no decimal handling
- **Service Layer Updates**: Seat counters updated in service functions, not via DB triggers
- **MCP Server First**: MCP server must be created before FastAPI app (lifespan combination requirement)
- **No Cascade Deletes**: Bookings don't auto-delete when flights/users deleted
- **UTC Timestamps**: Stored as ISO strings via `datetime.utcnow().isoformat()`

This architecture ensures:
- Business logic is tested independently of transport layer
- Same validation and error handling for both REST and MCP
- Easy to add new transport layers (GraphQL, gRPC, etc.)
- Type safety throughout the stack

### Critical Patterns

For detailed non-obvious patterns and architectural constraints, see **[../AGENTS.md](../AGENTS.md)**, which documents:
- Service layer error handling patterns
- Database operation specifics
- Type system conventions
- Testing architecture
- MCP integration patterns

## Troubleshooting

### Tests Fail to Run
- **Symptom**: `pytest` can't find `conftest.py`
- **Solution**: Always run tests from the `booking_system_backend` directory, not project root

### Database Errors
- **Symptom**: "database is locked" or connection errors
- **Solution**: Delete `booking.db` and restart server to recreate with fresh seed data

### Port Already in Use
- **Symptom**: "Address already in use" on port 8080
- **Solution**: Kill existing process: `lsof -ti:8080 | xargs kill -9` (macOS/Linux)

### Import Errors
- **Symptom**: `ModuleNotFoundError` for services or models
- **Solution**: Ensure virtual environment is activated and dependencies installed

### Seat Class Validation Fails
- **Symptom**: "Invalid seat class" errors
- **Solution**: Use exact strings: `"economy"`, `"business"`, or `"galaxium"` (case-sensitive)
