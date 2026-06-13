# Inventory Hold & Quote Service

Java microservice for B2B quote and hold workflow, demonstrating Java modernization from legacy to modern stack.

## Overview

This service manages temporary inventory holds for travel agencies:
- Create quotes for flights with pricing
- Place holds with automatic expiration (15 minutes default)
- Confirm holds into real bookings via Python backend
- Auto-expire holds after timeout
- Maintain complete audit trail

## Architecture

```
Frontend → Python Backend → Java Hold Service
                ↓                    ↓
           SQLite DB            SQLite DB
```

**Integration Pattern:**
- Python backend proxies all Java service calls
- Java service calls Python backend to confirm bookings
- No direct frontend-to-Java communication

## Technology Stack

- **Java 17** (modern target)
- **Spring Boot 3.2.0**
- **Maven** for build management
- **SQLite** for persistence
- **JPA/Hibernate** for ORM
- **Lombok** for reducing boilerplate

## Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+
- Python backend running on port 8000

### Local Development

1. **Build the project:**
```bash
cd inventory_hold_service
mvn clean package
```

2. **Run the service:**
```bash
java -jar target/inventory-hold-service-1.0.0.jar
```

Or use Maven:
```bash
mvn spring-boot:run
```

The service will start on `http://localhost:8080`

### Docker

```bash
docker build -t inventory-hold-service .
docker run -p 8080:8080 \
  -e PYTHON_BACKEND_URL=http://host.docker.internal:8000 \
  inventory-hold-service
```

## API Endpoints

Base URL: `http://localhost:8080/api/v1`

### Health Check

```bash
curl http://localhost:8080/api/v1/health
```

Response:
```json
{"status": "UP"}
```

### Create Quote

```bash
curl -X POST http://localhost:8080/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": 1,
    "seatClass": "business",
    "quantity": 2,
    "travelerId": 1,
    "travelerName": "John Doe"
  }'
```

Response:
```json
{
  "quoteId": "Q-2026-000001",
  "flightId": 1,
  "seatClass": "business",
  "quantity": 2,
  "travelerId": 1,
  "travelerName": "John Doe",
  "pricePerSeat": 2500000,
  "totalPrice": 5000000,
  "expiresAt": "2026-04-10T16:00:00Z",
  "status": "CREATED",
  "createdAt": "2026-04-09T16:00:00Z"
}
```

### Get Quote

```bash
curl http://localhost:8080/api/v1/quotes/Q-2026-000001
```

### Create Hold

```bash
curl -X POST http://localhost:8080/api/v1/quotes/Q-2026-000001/holds
```

Response:
```json
{
  "holdId": "H-2026-000001",
  "quoteId": "Q-2026-000001",
  "status": "HELD",
  "reservedUntil": "2026-04-09T16:15:00Z",
  "externalBookingReference": null,
  "errorMessage": null,
  "createdAt": "2026-04-09T16:00:00Z",
  "updatedAt": "2026-04-09T16:00:00Z"
}
```

### Get Hold

```bash
curl http://localhost:8080/api/v1/holds/H-2026-000001
```

### Confirm Hold

Creates a booking in the Python backend and updates the hold:

```bash
curl -X POST http://localhost:8080/api/v1/holds/H-2026-000001/confirm
```

Response:
```json
{
  "holdId": "H-2026-000001",
  "quoteId": "Q-2026-000001",
  "status": "CONFIRMED",
  "reservedUntil": "2026-04-09T16:15:00Z",
  "externalBookingReference": "42",
  "errorMessage": null,
  "createdAt": "2026-04-09T16:00:00Z",
  "updatedAt": "2026-04-09T16:05:00Z"
}
```

### Release Hold

Manually release a hold before expiration:

```bash
curl -X POST http://localhost:8080/api/v1/holds/H-2026-000001/release
```

## Complete Demo Flow

```bash
# 1. Create a quote
QUOTE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": 1,
    "seatClass": "business",
    "quantity": 2,
    "travelerId": 1,
    "travelerName": "John Doe"
  }')

QUOTE_ID=$(echo $QUOTE_RESPONSE | jq -r '.quoteId')
echo "Created quote: $QUOTE_ID"

# 2. Create a hold from the quote
HOLD_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/quotes/$QUOTE_ID/holds)
HOLD_ID=$(echo $HOLD_RESPONSE | jq -r '.holdId')
echo "Created hold: $HOLD_ID"

# 3. Confirm the hold (creates booking in Python backend)
curl -X POST http://localhost:8080/api/v1/holds/$HOLD_ID/confirm

# 4. Verify the booking was created in Python backend
curl http://localhost:8000/api/bookings/1
```

## Configuration

Edit `src/main/resources/application.properties`:

```properties
# Server Configuration
server.port=8080

# Database
spring.datasource.url=jdbc:sqlite:./holds.db

# Python Backend Integration
python.backend.url=http://localhost:8000

# Hold Configuration
hold.duration.minutes=15
hold.expiration.check.interval.seconds=60

# Logging
logging.level.com.galaxium.holdservice=DEBUG
```

### Environment Variables

- `PYTHON_BACKEND_URL` - URL of Python backend (default: `http://localhost:8000`)
- `SPRING_DATASOURCE_URL` - SQLite database path (default: `jdbc:sqlite:./holds.db`)

## Business Rules

- **Hold Duration:** 15 minutes (configurable)
- **Quote Expiration:** 24 hours
- **Expiration Job:** Runs every 60 seconds
- **Idempotency:** Confirming the same hold twice returns the same result
- **Error Handling:** Failed confirmations mark hold as `CONFIRMATION_FAILED`

## State Transitions

### Quote States
- `CREATED` - Initial state, can be used to create holds

### Hold States
- `HELD` - Active hold, can be confirmed or released
- `CONFIRMED` - Successfully converted to booking
- `EXPIRED` - Automatically expired after timeout
- `RELEASED` - Manually released before expiration
- `CONFIRMATION_FAILED` - Failed to create booking in Python backend

## Database Schema

The service uses SQLite with JPA auto-DDL. Tables:

- `quotes` - Quote records with pricing
- `holds` - Hold records with status tracking
- `audit_events` - Complete audit trail

## Development

### Project Structure

```
inventory_hold_service/
├── src/main/java/com/galaxium/holdservice/
│   ├── HoldServiceApplication.java    # Main application
│   ├── api/                            # REST controllers
│   │   ├── QuoteController.java
│   │   ├── HoldController.java
│   │   └── HealthController.java
│   ├── domain/                         # JPA entities
│   │   ├── Quote.java
│   │   ├── Hold.java
│   │   └── AuditEvent.java
│   ├── service/                        # Business logic
│   │   ├── QuoteService.java
│   │   ├── HoldService.java
│   │   └── PricingService.java
│   ├── repository/                     # Data access
│   │   ├── QuoteRepository.java
│   │   ├── HoldRepository.java
│   │   └── AuditEventRepository.java
│   ├── client/                         # External integrations
│   │   └── PythonBackendClient.java
│   └── scheduler/                      # Background jobs
│       └── HoldExpirationScheduler.java
└── src/main/resources/
    └── application.properties
```

### Building

```bash
# Clean build
mvn clean package

# Skip tests
mvn clean package -DskipTests

# Run tests only
mvn test
```

## Integration with Python Backend

The Java service integrates with the Python backend through:

1. **Internal Booking Endpoint** (`/api/internal/bookings/from-hold`)
   - Called by Java service when confirming holds
   - Creates actual bookings in the Python system

2. **Proxy Endpoints** (in Python backend)
   - `/api/quotes` - Create quote
   - `/api/quotes/{id}` - Get quote
   - `/api/quotes/{id}/holds` - Create hold
   - `/api/holds/{id}` - Get hold
   - `/api/holds/{id}/confirm` - Confirm hold
   - `/api/holds/{id}/release` - Release hold

## Monitoring

### Logs

```bash
# View logs
tail -f logs/spring.log

# Or if running with Docker
docker logs -f <container-id>
```

### Health Check

```bash
curl http://localhost:8080/api/v1/health
```

## Troubleshooting

### Service won't start

1. Check Java version: `java -version` (must be 17+)
2. Check port 8080 is available: `lsof -i :8080`
3. Verify Python backend is running on port 8000

### Cannot confirm holds

1. Verify Python backend URL: `echo $PYTHON_BACKEND_URL`
2. Test Python backend connectivity: `curl http://localhost:8000/api/`
3. Check logs for connection errors

### Holds not expiring

1. Verify scheduler is enabled in logs
2. Check `hold.expiration.check.interval.seconds` configuration
3. Ensure holds have `HELD` status and `reservedUntil` in the past

## License

See main project LICENSE file.