# Galaxium Travels - Startup Guide

This guide explains how to start the complete system including the new Java Hold Service.

## Quick Start Options

### Option 1: Docker Compose (Recommended)

Start all services with one command:

```bash
docker-compose up --build
```

This starts:
- PostgreSQL database (port 5432)
- Python backend (port 8000)
- Java hold service (port 8080)
- Frontend (port 3000)

Access the application:
- **Frontend:** http://localhost:5173
- **Python API:** http://localhost:8001/api/
- **Java API:** http://localhost:8082/api/v1/
- **API Docs:** http://localhost:8001/docs

To stop:
```bash
docker-compose down
```

### Option 2: Local Development (All Services)

Start all services locally for development:

#### Step 1: Start Python Backend

```bash
./start_locally.sh
```

This starts:
- Python backend on port 8000
- Frontend on port 5173

#### Step 2: Start Java Service (in a new terminal)

```bash
cd inventory_hold_service
chmod +x start-java-service.sh
./start-java-service.sh
```

This starts:
- Java hold service on port 8080

Access the application:
- **Frontend:** http://localhost:5173
- **Python API:** http://localhost:8001/api/
- **Java API:** http://localhost:8082/api/v1/
- **API Docs:** http://localhost:8001/docs

### Option 3: Manual Start (Individual Services)

#### Python Backend

```bash
cd booking_system_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

#### Java Service

```bash
cd inventory_hold_service
mvn clean package
java -jar target/inventory-hold-service-1.0.0.jar
```

Or use Maven directly:
```bash
cd inventory_hold_service
mvn spring-boot:run
```

#### Frontend

```bash
cd booking_system_frontend
npm install
npm run dev
```

## Prerequisites

### For Docker Compose
- Docker Desktop or Docker Engine
- Docker Compose

### For Local Development

**Python Backend:**
- Python 3.9+
- pip

**Java Service:**
- Java 17 or higher
- Maven 3.6+

**Frontend:**
- Node.js 16+
- npm

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Python Backend | 8001 | http://localhost:8001 |
| Java Hold Service | 8082 | http://localhost:8082 |
| PostgreSQL (Docker) | 5433 | localhost:5433 |

## Testing the Java Service

Once all services are running, test the hold/quote workflow:

### 1. Create a Quote

```bash
curl -X POST http://localhost:8082/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": 1,
    "seatClass": "business",
    "quantity": 2,
    "travelerId": 1,
    "travelerName": "John Doe"
  }'
```

### 2. Create a Hold

```bash
# Use the quoteId from step 1
curl -X POST http://localhost:8082/api/v1/quotes/Q-2026-000001/holds
```

### 3. Confirm Hold

```bash
# Use the holdId from step 2
curl -X POST http://localhost:8082/api/v1/holds/H-2026-000001/confirm
```

### 4. Verify Booking

```bash
# Check the booking was created in Python backend
curl http://localhost:8001/api/bookings/1
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
lsof -i :8082  # or :8001, :5173, :5433, etc.

# Kill the process
kill -9 <PID>
```

### Java Service Won't Start

1. Check Java version:
```bash
java -version  # Should be 17 or higher
```

2. Check Maven:
```bash
mvn -version
```

3. Rebuild:
```bash
cd inventory_hold_service
mvn clean package
```

### Python Backend Connection Error

Make sure Python backend is running on port 8000:
```bash
curl http://localhost:8000/api/
```

If not, check the `start_locally.sh` script updated the port from 8080 to 8000.

### Database Issues (Docker)

Reset the database:
```bash
docker-compose down -v  # Removes volumes
docker-compose up --build
```

## Development Workflow

### Making Changes to Java Service

1. Make your code changes
2. Rebuild: `mvn clean package`
3. Restart the service

Or use Maven's hot reload:
```bash
mvn spring-boot:run
```

### Making Changes to Python Backend

The service auto-reloads when you save files (if using uvicorn with --reload).

### Making Changes to Frontend

Vite automatically hot-reloads changes.

## Environment Variables

### Java Service

- `PYTHON_BACKEND_URL` - Python backend URL (default: http://localhost:8000)
- `SPRING_DATASOURCE_URL` - Database URL (default: jdbc:sqlite:./holds.db)

### Python Backend

- `JAVA_SERVICE_URL` - Java service URL (default: http://localhost:8080)
- `DATABASE_URL` - PostgreSQL connection string
- `SEED_DEMO_DATA` - Seed demo data on startup (default: true)

### Frontend

- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)

## Logs

### Docker Compose

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f java-service
docker-compose logs -f backend
```

### Local Development

- Python: Check terminal output
- Java: Check terminal output or `logs/spring.log`
- Frontend: Check terminal output

## Next Steps

1. **Explore the APIs:**
   - Python API docs: http://localhost:8000/docs
   - Java health check: http://localhost:8080/api/v1/health

2. **Try the Demo Flow:**
   - See `inventory_hold_service/README.md` for complete examples

3. **Read the Documentation:**
   - `inventory_hold_service/README.md` - Java service guide
   - `inventory_hold_service/docs/MODERNIZATION.md` - Architecture details
   - `inventory_hold_service/IMPLEMENTATION_SUMMARY.md` - Implementation overview

## Support

For issues or questions:
1. Check the logs
2. Review the README files
3. Verify all prerequisites are installed
4. Ensure ports are not in use

Happy coding! 🚀