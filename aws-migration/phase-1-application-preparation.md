# Phase 1: Application Preparation

## Overview
Prepare the Galaxium Travels application for AWS deployment by migrating from SQLite to PostgreSQL, adding environment configuration, and optimizing Docker containers.

**Duration:** 2-3 days  
**Prerequisites:** None  
**Next Phase:** [Phase 2: Infrastructure as Code](./phase-2-infrastructure-as-code.md)

---

## Objectives

- [ ] Migrate database from SQLite to PostgreSQL
- [ ] Implement environment-based configuration
- [ ] Create production-ready Dockerfiles
- [ ] Add health check endpoints
- [ ] Update dependencies for production
- [ ] Test locally with PostgreSQL

---

## 1. Database Migration

### 1.1 Update Backend Dependencies

**File:** `booking_system_backend/requirements.txt`

Add PostgreSQL driver:
```txt
psycopg2-binary
```

### 1.2 Modify Database Configuration

**File:** `booking_system_backend/db.py`

**Current:**
```python
SQLALCHEMY_DATABASE_URL = 'sqlite:///./booking.db'

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
```

**Updated:**
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Support both SQLite (dev) and PostgreSQL (prod)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./booking.db"  # Default for local dev
)

# PostgreSQL doesn't need check_same_thread
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 1.3 Create Environment Files

**File:** `booking_system_backend/.env.example`

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/galaxium_db

# Server Configuration
HOST=0.0.0.0
PORT=8080

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Environment
ENVIRONMENT=production
```

**File:** `booking_system_backend/.env.local`

```env
# Local Development
DATABASE_URL=sqlite:///./booking.db
HOST=127.0.0.1
PORT=8080
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=development
```

### 1.4 Update Server Configuration

**File:** `booking_system_backend/server.py`

Add environment variable loading at the top:
```python
import os
from dotenv import load_dotenv

load_dotenv()  # Load .env file

# Update CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 2. Health Check Endpoints

### 2.1 Add Health Check Route

**File:** `booking_system_backend/server.py`

Add after app initialization:
```python
@app.get("/health")
def health_check():
    """Health check endpoint for load balancer"""
    return {
        "status": "healthy",
        "service": "galaxium-booking-backend",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health/db")
def database_health_check(db: Session = Depends(get_db)):
    """Database connectivity check"""
    try:
        # Simple query to test DB connection
        db.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
```

---

## 3. Backend Docker Optimization

### 3.1 Create Production Dockerfile

**File:** `booking_system_backend/Dockerfile.prod`

```dockerfile
# Multi-stage build for smaller image
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Add local bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')"

EXPOSE 8080

# Use gunicorn for production
CMD ["gunicorn", "server:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080"]
```

### 3.2 Update Requirements for Production

**File:** `booking_system_backend/requirements.txt`

Add:
```txt
gunicorn
```

### 3.3 Create .dockerignore

**File:** `booking_system_backend/.dockerignore`

```
.venv/
__pycache__/
*.pyc
*.pyo
*.pyd
.pytest_cache/
.coverage
htmlcov/
*.db
.env
.env.local
*.log
```

---

## 4. Frontend Docker Creation

### 4.1 Create Frontend Dockerfile

**File:** `booking_system_frontend/Dockerfile`

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Add script to inject runtime environment variables
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### 4.2 Create Nginx Configuration

**File:** `booking_system_frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API proxy (if needed)
    location /api {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.3 Create Docker Entrypoint Script

**File:** `booking_system_frontend/docker-entrypoint.sh`

```bash
#!/bin/sh
set -e

# Replace environment variables in JavaScript files at runtime
# This allows changing API URL without rebuilding the image
if [ -n "$VITE_API_URL" ]; then
    echo "Injecting VITE_API_URL: $VITE_API_URL"
    find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|VITE_API_URL_PLACEHOLDER|$VITE_API_URL|g" {} \;
fi

# Execute the CMD
exec "$@"
```

### 4.4 Update Frontend Environment Handling

**File:** `booking_system_frontend/src/services/api.ts`

Update API base URL:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

### 4.5 Create Frontend .dockerignore

**File:** `booking_system_frontend/.dockerignore`

```
node_modules/
dist/
.git/
.gitignore
*.md
.env
.env.local
.vscode/
```

---

## 5. Local Testing with PostgreSQL

### 5.1 Create Docker Compose for Testing

**File:** `docker-compose.test.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: galaxium_db
      POSTGRES_USER: galaxium_user
      POSTGRES_PASSWORD: galaxium_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U galaxium_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./booking_system_backend
      dockerfile: Dockerfile.prod
    environment:
      DATABASE_URL: postgresql://galaxium_user:galaxium_pass@postgres:5432/galaxium_db
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./booking_system_frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: http://localhost:8080
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 5.2 Test Commands

```bash
# Start all services
docker-compose -f docker-compose.test.yml up -d

# View logs
docker-compose -f docker-compose.test.yml logs -f

# Test health endpoints
curl http://localhost:8080/health
curl http://localhost:8080/health/db
curl http://localhost:3000/health

# Stop services
docker-compose -f docker-compose.test.yml down

# Clean up (including volumes)
docker-compose -f docker-compose.test.yml down -v
```

---

## 6. Verification Checklist

- [ ] Backend connects to PostgreSQL successfully
- [ ] Health check endpoints return 200 OK
- [ ] Frontend builds without errors
- [ ] Frontend can communicate with backend
- [ ] Docker images build successfully
- [ ] Docker Compose test environment works
- [ ] All tests pass with PostgreSQL
- [ ] Environment variables are properly loaded
- [ ] No hardcoded credentials in code

---

## 7. Migration Script

**File:** `booking_system_backend/migrate_to_postgres.py`

```python
"""
Script to migrate data from SQLite to PostgreSQL
Run this once during migration
"""
import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os

def migrate_data():
    # Connect to SQLite
    sqlite_conn = sqlite3.connect('booking.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    pg_cursor = pg_conn.cursor()
    
    # Migrate users
    sqlite_cursor.execute("SELECT * FROM users")
    users = sqlite_cursor.fetchall()
    if users:
        execute_values(
            pg_cursor,
            "INSERT INTO users (id, name, email) VALUES %s ON CONFLICT DO NOTHING",
            users
        )
    
    # Migrate flights
    sqlite_cursor.execute("SELECT * FROM flights")
    flights = sqlite_cursor.fetchall()
    if flights:
        execute_values(
            pg_cursor,
            "INSERT INTO flights (id, origin, destination, departure_time, arrival_time, price, seats_available) VALUES %s ON CONFLICT DO NOTHING",
            flights
        )
    
    # Migrate bookings
    sqlite_cursor.execute("SELECT * FROM bookings")
    bookings = sqlite_cursor.fetchall()
    if bookings:
        execute_values(
            pg_cursor,
            "INSERT INTO bookings (id, user_id, flight_id, status, created_at) VALUES %s ON CONFLICT DO NOTHING",
            bookings
        )
    
    pg_conn.commit()
    print("Migration completed successfully!")
    
    sqlite_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate_data()
```

---

## Next Steps

Once Phase 1 is complete:
1. Commit all changes to version control
2. Tag the release (e.g., `v1.0.0-aws-ready`)
3. Proceed to [Phase 2: Infrastructure as Code](./phase-2-infrastructure-as-code.md)

---

**Estimated Time:** 2-3 days  
**Difficulty:** Medium  
**Dependencies:** None