# Inventory Hold & Quote Service - Implementation Spec

**Purpose:** Java microservice for B2B quote/hold workflow, demonstrating Java modernization from legacy to modern stack.

---

## 1. What It Does

Manages temporary inventory holds for travel agencies:
- Create quotes for flights
- Place holds with expiration timers
- Confirm holds into real bookings (via Python backend)
- Auto-expire holds after timeout
- Maintain audit trail

---

## 2. Architecture

```
Frontend → Python Backend → Java Hold Service
                ↓                    ↓
           SQLite DB            SQLite DB
```

**Integration:**
- Python backend proxies all Java service calls
- Java service calls Python backend to confirm bookings
- No direct frontend-to-Java communication

---

## 3. Domain Model

### Quote
```java
{
  quoteId: "Q-2026-000123",
  flightId: 3,
  seatClass: "business",
  quantity: 2,
  travelerId: 1,              // Python user_id
  travelerName: "John Doe",   // Python user.name
  pricePerSeat: 2500000,
  totalPrice: 5000000,
  expiresAt: "2026-04-09T16:00:00Z",
  status: "CREATED"
}
```

### Hold
```java
{
  holdId: "H-2026-000045",
  quoteId: "Q-2026-000123",
  status: "HELD",              // HELD, EXPIRED, CONFIRMED, RELEASED
  reservedUntil: "2026-04-09T15:55:00Z",
  externalBookingReference: null  // Set when confirmed
}
```

### State Transitions
```
Quote:  CREATED → (used for hold)
Hold:   HELD → CONFIRMED (success)
             → EXPIRED (timeout)
             → RELEASED (manual)
             → CONFIRMATION_FAILED (error)
```

---

## 4. API Endpoints

**Base:** `/api/v1`

### Create Quote
```
POST /quotes
Body: {
  flightId: 3,
  seatClass: "business",
  quantity: 2,
  travelerId: 1,
  travelerName: "John Doe"
}
Response: Quote object
```

### Get Quote
```
GET /quotes/{quoteId}
Response: Quote object
```

### Create Hold
```
POST /quotes/{quoteId}/holds
Response: Hold object
```

### Get Hold
```
GET /holds/{holdId}
Response: Hold object
```

### Confirm Hold
```
POST /holds/{holdId}/confirm
Response: Hold object with externalBookingReference
```

### Release Hold
```
POST /holds/{holdId}/release
Response: Hold object with status=RELEASED
```

### Health Check
```
GET /health
Response: { status: "UP" }
```

---

## 5. Python Backend Integration

### Required New Endpoint

Add to [`booking_system_backend/server.py`](../booking_system_backend/server.py):

```python
@app.post("/api/internal/bookings/from-hold")
async def create_booking_from_hold(
    hold_data: dict,
    db: Session = Depends(get_db)
) -> BookingOut | ErrorResponse:
    """Create booking from Java hold service"""
    return booking.book_flight(
        db,
        user_id=hold_data["travelerId"],
        name=hold_data["travelerName"],
        flight_id=hold_data["flightId"],
        seat_class=hold_data["seatClass"]
    )
```

### Required Proxy Endpoints

Add to Python backend for frontend access:

```python
JAVA_SERVICE_URL = os.getenv("JAVA_SERVICE_URL", "http://localhost:8080")

@app.post("/api/quotes")
async def create_quote(quote_data: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{JAVA_SERVICE_URL}/api/v1/quotes", json=quote_data)
        return response.json()

# Similar proxies for GET /quotes/{id}, POST /holds, etc.
```

---

## 6. Business Rules

- **Hold Duration:** 15 minutes default
- **Expiration Job:** Runs every 60 seconds, marks expired holds
- **Confirmation:** Calls Python backend, stores booking reference
- **Error Handling:** If Python backend fails, mark hold as `CONFIRMATION_FAILED`
- **Idempotency:** Confirming same hold twice returns same result

---

## 7. Technology Stack

### Legacy Starting Point (for demo)
- Java 8
- Maven
- JAX-RS or Servlets
- XML config
- WAR packaging

### Modern Target
- Java 17+
- Maven
- Spring Boot or Open Liberty
- JSON config
- Container deployment

---

## 8. Database Schema

```sql
CREATE TABLE quotes (
  quote_id VARCHAR PRIMARY KEY,
  flight_id INTEGER NOT NULL,
  seat_class VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  traveler_id INTEGER NOT NULL,
  traveler_name VARCHAR NOT NULL,
  price_per_seat INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE holds (
  hold_id VARCHAR PRIMARY KEY,
  quote_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  reserved_until TIMESTAMP NOT NULL,
  external_booking_reference VARCHAR,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(quote_id)
);

CREATE TABLE audit_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_holds_status ON holds(status);
CREATE INDEX idx_holds_reserved_until ON holds(reserved_until);
```

---

## 9. Local Development

### Docker Compose Setup

```yaml
version: '3.8'
services:
  python-backend:
    build: ./booking_system_backend
    ports:
      - "8000:8000"
    environment:
      - JAVA_SERVICE_URL=http://java-service:8080
      - SEED_DEMO_DATA=true

  java-service:
    build: ./inventory_hold_service
    ports:
      - "8080:8080"
    environment:
      - PYTHON_BACKEND_URL=http://python-backend:8000
      - DATABASE_URL=sqlite:///./holds.db
    depends_on:
      - python-backend

  frontend:
    build: ./booking_system_frontend
    ports:
      - "5173:80"
    environment:
      - VITE_API_URL=http://localhost:8000/api
```

**Start:** `docker-compose up`

---

## 10. Demo Flow

```bash
# 1. Create quote
curl -X POST http://localhost:8080/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": 1,
    "seatClass": "business",
    "quantity": 2,
    "travelerId": 1,
    "travelerName": "John Doe"
  }'

# 2. Create hold
curl -X POST http://localhost:8080/api/v1/quotes/Q-2026-000001/holds

# 3. Confirm hold (creates booking in Python backend)
curl -X POST http://localhost:8080/api/v1/holds/H-2026-000001/confirm

# 4. Verify booking
curl http://localhost:8000/api/bookings/1
```

---

## 11. Implementation Phases

### Phase 1: Core Service (Week 1)
- Maven project setup
- Quote CRUD endpoints
- Hold CRUD endpoints
- SQLite persistence
- Health endpoint

### Phase 2: Business Logic (Week 1)
- Hold expiration scheduler
- State transitions
- Audit events
- Basic validation

### Phase 3: Integration (Week 2)
- Python backend client
- Confirm hold flow
- Error handling
- Docker setup

### Phase 4: Polish (Week 2)
- Tests
- Documentation
- Demo scripts
- Modernization notes

---

## 12. Testing Strategy

**Unit Tests:**
- Quote/Hold domain logic
- State transitions
- Validation rules

**Integration Tests:**
- Database operations
- Expiration job
- API endpoints

**Manual E2E:**
- Full quote → hold → confirm flow
- Expiration scenarios
- Error cases

---

## 13. What's Out of Scope (for v1)

- Authentication/authorization
- Frontend UI components
- Real-time WebSocket updates
- Shareable quote links
- Agency management
- Performance optimization
- AWS deployment
- Distributed transaction handling
- Circuit breakers
- Advanced observability

---

## 14. Success Criteria

Demo is complete when:
- ✅ Can create quotes via API
- ✅ Can create holds from quotes
- ✅ Holds expire automatically after timeout
- ✅ Can confirm hold → creates booking in Python backend
- ✅ Can retrieve hold with booking reference
- ✅ Both services run together via docker-compose
- ✅ README with curl examples works

---

## 15. Folder Structure

```
inventory_hold_service/
├── README.md
├── pom.xml
├── Dockerfile
├── src/
│   ├── main/
│   │   ├── java/com/galaxium/holdservice/
│   │   │   ├── api/          # REST controllers
│   │   │   ├── domain/       # Quote, Hold entities
│   │   │   ├── service/      # Business logic
│   │   │   ├── repository/   # Database access
│   │   │   ├── client/       # Python backend client
│   │   │   └── scheduler/    # Expiration job
│   │   └── resources/
│   │       ├── application.properties
│   │       └── schema.sql
│   └── test/
└── docs/
    └── MODERNIZATION.md
```

---

**Estimated Effort:** 2 weeks for working demo  
**Lines of Code:** ~2000-3000 Java LOC  
**Dependencies:** Spring Boot, SQLite JDBC, HTTP client, JUnit