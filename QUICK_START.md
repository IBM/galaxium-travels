# 🚀 Quick Start - Galaxium Travels with Java Hold Service

## Fastest Way to Start Everything

### Option 1: Docker (Easiest)

```bash
docker-compose up --build
```

**Access:**
- Frontend: http://localhost:5173
- Python API: http://localhost:8001/api/
- Java API: http://localhost:8082/api/v1/
- API Docs: http://localhost:8001/docs

### Option 2: Local Development

**Terminal 1 - Python Backend & Frontend:**
```bash
./start_locally.sh
```

**Terminal 2 - Java Service:**
```bash
cd inventory_hold_service
./start-java-service.sh
```

**Access:**
- Frontend: http://localhost:5173
- Python API: http://localhost:8001/api/
- Java API: http://localhost:8082/api/v1/

## Test the Java Hold Service

```bash
# 1. Create a quote
curl -X POST http://localhost:8082/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{"flightId":1,"seatClass":"business","quantity":2,"travelerId":1,"travelerName":"John Doe"}'

# 2. Create hold (replace Q-2026-000001 with your quote ID)
curl -X POST http://localhost:8082/api/v1/quotes/Q-2026-000001/holds

# 3. Confirm hold (replace H-2026-000001 with your hold ID)
curl -X POST http://localhost:8082/api/v1/holds/H-2026-000001/confirm

# 4. Verify booking in Python backend
curl http://localhost:8001/api/bookings/1
```

## Prerequisites

**Docker:**
- Docker Desktop

**Local:**
- Python 3.9+
- Java 17+
- Maven 3.6+
- Node.js 16+

## Need Help?

See [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for detailed instructions.