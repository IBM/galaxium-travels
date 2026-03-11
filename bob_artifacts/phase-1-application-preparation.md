# Phase 1: Application Preparation

## Goal
Prepare the application to run on AWS by adding PostgreSQL support and creating production Docker images.

## Duration
1-2 days

## Prerequisites
- Docker installed locally
- PostgreSQL installed locally for testing
- Application currently running with SQLite

## Tasks

### 1. Add PostgreSQL Support to Backend

**Update requirements.txt:**
Add PostgreSQL driver:
```
psycopg2-binary
```

**Update db.py:**
Modify to support both SQLite (local) and PostgreSQL (production):
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Use environment variable for database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./booking.db')

engine = create_engine(DATABASE_URL)
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

**Test locally with PostgreSQL:**
```bash
# Start local PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15

# Set environment variable
export DATABASE_URL="postgresql://postgres:test@localhost:5432/booking"

# Run application
python server.py
```

### 2. Create Production Dockerfile for Backend

**Create booking_system_backend/Dockerfile.prod:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "server.py"]
```

**Create booking_system_backend/.dockerignore:**
```
.venv
__pycache__
*.pyc
*.db
.env
tests/
```

### 3. Create Production Dockerfile for Frontend

**Create booking_system_frontend/Dockerfile.prod:**
```dockerfile
# Build stage
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create booking_system_frontend/nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Create booking_system_frontend/.dockerignore:**
```
node_modules
dist
.env
```

### 4. Update Frontend API Configuration

**Update booking_system_frontend/src/services/api.ts:**
Use environment variable for API URL:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

**Create booking_system_frontend/.env.production:**
```
VITE_API_URL=/api
```

### 5. Test Docker Images Locally

**Build images:**
```bash
# Backend
cd booking_system_backend
docker build -f Dockerfile.prod -t booking-backend:latest .

# Frontend
cd ../booking_system_frontend
docker build -f Dockerfile.prod -t booking-frontend:latest .
```

**Test with docker-compose:**
Create `docker-compose.test.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: booking
    ports:
      - "5432:5432"

  backend:
    image: booking-backend:latest
    environment:
      DATABASE_URL: postgresql://postgres:testpass@postgres:5432/booking
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  frontend:
    image: booking-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
```

**Run test:**
```bash
docker-compose -f docker-compose.test.yml up
```

Access http://localhost and verify the application works.

## Validation Checklist

- [ ] PostgreSQL driver added to requirements.txt
- [ ] db.py updated to support DATABASE_URL environment variable
- [ ] Application tested with local PostgreSQL
- [ ] Backend Dockerfile.prod created
- [ ] Frontend Dockerfile.prod created
- [ ] nginx.conf created for frontend
- [ ] Both Docker images build successfully
- [ ] docker-compose.test.yml created
- [ ] Application works with Docker containers locally
- [ ] All features functional (browse flights, create bookings, etc.)

## Expected Outputs

- Updated [`booking_system_backend/requirements.txt`](../booking_system_backend/requirements.txt)
- Updated [`booking_system_backend/db.py`](../booking_system_backend/db.py)
- New file: `booking_system_backend/Dockerfile.prod`
- New file: `booking_system_backend/.dockerignore`
- New file: `booking_system_frontend/Dockerfile.prod`
- New file: `booking_system_frontend/nginx.conf`
- New file: `booking_system_frontend/.dockerignore`
- New file: `docker-compose.test.yml`
- Working Docker images for both frontend and backend

## Next Phase

Once all validation items are complete, proceed to **Phase 2: AWS Infrastructure Setup**.