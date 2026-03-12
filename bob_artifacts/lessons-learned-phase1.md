# Lessons Learned - Phase 1: Application Preparation

## Overview
This document captures all issues, challenges, and solutions encountered during Phase 1 of the AWS migration project. Use these insights to create custom rules for future demos and implementations.

---

## 1. TypeScript Compilation Errors in Docker Builds

### Issue
Frontend Docker build failed with TypeScript errors about unused imports:
```
error TS6133: 'Calendar' is declared but its value is never read.
error TS6133: 'Clock' is declared but its value is never read.
error TS6133: 'Sparkles' is declared but its value is never read.
```

### Root Cause
- Unused imports in React components
- TypeScript strict mode enabled in production builds
- Development environment may not catch these with same strictness

### Solution
Removed unused imports from:
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/flights/FlightCard.tsx`

### Custom Rule Recommendation
```markdown
**Rule: Clean Imports Before Docker Builds**
- Always run TypeScript compilation locally before building Docker images
- Use `npm run build` or `tsc --noEmit` to catch compilation errors early
- Consider adding a pre-commit hook to check for unused imports
- Add to CI/CD: `npm run lint` before Docker build steps
```

---

## 2. Port 80 Conflicts in Local Development

### Issue
Port 80 was already in use by Kubernetes/Traefik, preventing frontend container from binding.

### Root Cause
- Port 80 is commonly used by:
  - Apache/nginx web servers
  - Kubernetes ingress controllers (Traefik, nginx-ingress)
  - IIS on Windows
  - Other development tools
- Requires admin/sudo privileges on some systems

### Solution
Changed docker-compose.test.yml to use port 3000 instead:
```yaml
frontend:
  ports:
    - "3000:80"  # Maps host 3000 to container 80
```

### Custom Rule Recommendation
```markdown
**Rule: Use Non-Privileged Ports for Local Development**
- Frontend: Use port 3000 (standard React/Node.js dev port)
- Backend: Use port 8080 (common alternative to 80)
- Database: Use standard ports (5432 for PostgreSQL, 3306 for MySQL)
- Document that production will use standard ports (80/443) behind load balancer
- Add port conflict troubleshooting section to documentation
```

---

## 3. Nginx Proxy Configuration - Path Stripping

### Issue
Frontend showed "Failed to load flights" error. Nginx was forwarding `/api/flights` to backend, but backend endpoints are at `/flights` (without `/api` prefix).

Backend logs showed:
```
INFO: "GET /api/flights HTTP/1.0" 404 Not Found
```

### Root Cause
Incorrect nginx proxy configuration:
```nginx
location /api {
    proxy_pass http://backend:8080;  # Wrong: forwards /api/flights as-is
}
```

### Solution
Fixed nginx configuration to strip the `/api` prefix:
```nginx
location /api/ {
    proxy_pass http://backend:8080/;  # Correct: trailing slash strips /api
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Custom Rule Recommendation
```markdown
**Rule: Nginx Proxy Path Handling**
- When proxying with path prefix stripping, use trailing slashes:
  - `location /api/` with `proxy_pass http://backend/;` strips `/api`
  - `location /api` with `proxy_pass http://backend` keeps `/api`
- Always test proxy configuration with curl before frontend integration
- Add proper proxy headers for production (X-Forwarded-For, X-Real-IP, etc.)
- Test command: `curl http://localhost:3000/api/endpoint` should work
```

---

## 4. PostgreSQL Connection Configuration

### Issue
Need to support both SQLite (local development) and PostgreSQL (production) without code changes.

### Solution
Updated `db.py` to use environment variable with fallback:
```python
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./booking.db')
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
```

### Custom Rule Recommendation
```markdown
**Rule: Database Configuration Best Practices**
- Always use environment variables for database URLs
- Provide sensible defaults for local development (SQLite)
- Handle database-specific connection arguments conditionally
- Document both local and production connection strings
- Use health checks in docker-compose to ensure DB is ready before app starts
```

---

## 5. Docker Image Rebuild Requirements

### Issue
After fixing nginx configuration, needed to rebuild frontend image and restart container for changes to take effect.

### Solution
```bash
# Rebuild image
docker build -f Dockerfile.prod -t booking-frontend:latest .

# Restart specific service
docker-compose -f docker-compose.test.yml up -d frontend
```

### Custom Rule Recommendation
```markdown
**Rule: Docker Configuration Changes**
- Configuration files copied during build (like nginx.conf) require image rebuild
- Environment variables can be changed without rebuild (docker-compose restart)
- Always rebuild after changing:
  - Dockerfiles
  - Configuration files (nginx.conf, etc.)
  - Application code
- Use `docker-compose up -d --build` to rebuild and restart in one command
```

---

## 6. Container Naming Conflicts

### Issue
Attempted to start containers but got error:
```
Error: The container name is already in use by container [ID]
```

### Root Cause
Previous containers not properly cleaned up.

### Solution
```bash
# Remove specific container
docker rm -f [container-id]

# Or clean up all
docker-compose -f docker-compose.test.yml down
```

### Custom Rule Recommendation
```markdown
**Rule: Docker Cleanup Procedures**
- Always use `docker-compose down` before `docker-compose up`
- Add cleanup commands to documentation
- Consider using `docker-compose down -v` to also remove volumes
- For complete cleanup: `docker system prune -a` (use with caution)
```

---

## 7. Multi-Stage Docker Builds for Frontend

### Issue
Frontend needs Node.js to build but nginx to serve in production.

### Solution
Used multi-stage Dockerfile:
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
```

### Custom Rule Recommendation
```markdown
**Rule: Multi-Stage Builds for Frontend Applications**
- Use multi-stage builds to minimize production image size
- Build stage: Use full Node.js image
- Production stage: Use lightweight nginx:alpine
- Copy only built artifacts (dist/) to production stage
- Results in ~90% smaller images (Node.js ~1GB vs nginx:alpine ~40MB)
```

---

## 8. Environment-Specific Configuration

### Issue
Frontend needs different API URLs for development vs production.

### Solution
Created `.env.production`:
```
VITE_API_URL=/api
```

And used in code:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

### Custom Rule Recommendation
```markdown
**Rule: Environment Configuration Management**
- Create separate .env files for each environment:
  - `.env.development` (local dev)
  - `.env.production` (production build)
  - `.env.example` (template)
- Use build tool's environment variable system (Vite, Create React App, etc.)
- Never hardcode URLs or credentials
- Document all required environment variables
```

---

## 9. Docker Compose Health Checks

### Issue
Backend tried to connect to PostgreSQL before it was ready.

### Solution
Added health check to PostgreSQL service:
```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5

backend:
  depends_on:
    postgres:
      condition: service_healthy
```

### Custom Rule Recommendation
```markdown
**Rule: Service Dependencies and Health Checks**
- Always add health checks for databases
- Use `depends_on` with `condition: service_healthy`
- Common health check commands:
  - PostgreSQL: `pg_isready -U postgres`
  - MySQL: `mysqladmin ping -h localhost`
  - Redis: `redis-cli ping`
- Set appropriate intervals and retries
```

---

## 10. .dockerignore Files

### Issue
Docker builds were slow and images were large due to including unnecessary files.

### Solution
Created `.dockerignore` files:

Backend:
```
.venv
__pycache__
*.pyc
*.db
.env
tests/
```

Frontend:
```
node_modules
dist
.env
```

### Custom Rule Recommendation
```markdown
**Rule: Always Create .dockerignore Files**
- Exclude development dependencies (node_modules, .venv)
- Exclude build artifacts (dist, __pycache__)
- Exclude sensitive files (.env, credentials)
- Exclude test files and documentation
- Results in faster builds and smaller images
```

---

## Summary of Key Takeaways

### Before Starting Docker Implementation:
1. ✅ Run local builds to catch compilation errors
2. ✅ Clean up unused imports and code
3. ✅ Test TypeScript compilation with strict mode
4. ✅ Choose non-conflicting ports for local development

### During Docker Configuration:
1. ✅ Create .dockerignore files first
2. ✅ Use multi-stage builds for frontend
3. ✅ Add health checks for all services
4. ✅ Use environment variables for all configuration
5. ✅ Test nginx proxy configuration separately

### Testing and Debugging:
1. ✅ Test backend API directly first (curl http://localhost:8080)
2. ✅ Test nginx proxy second (curl http://localhost:3000/api)
3. ✅ Check logs for both services
4. ✅ Verify container networking (docker network inspect)
5. ✅ Test in browser last

### Documentation:
1. ✅ Document all ports used
2. ✅ Provide troubleshooting section
3. ✅ Include cleanup commands
4. ✅ Add testing instructions
5. ✅ Explain production vs development differences

---

## Recommended Custom Rules for Future Demos

```markdown
# Custom Rules for Docker-based Demos

## Pre-Build Checks
- Run `npm run build` or `tsc --noEmit` before Docker builds
- Check for unused imports with linter
- Verify all environment variables are documented

## Port Selection
- Frontend: 3000 (avoid 80)
- Backend: 8080 (avoid 8000, 80)
- Database: Use standard ports (5432, 3306, 6379)

## Nginx Configuration
- Use trailing slashes for path stripping: `location /api/` → `proxy_pass http://backend/;`
- Include all proxy headers (X-Forwarded-For, X-Real-IP, Host)
- Test with curl before browser testing

## Docker Best Practices
- Always create .dockerignore files
- Use multi-stage builds for frontend
- Add health checks for all services
- Use `depends_on` with health conditions
- Document rebuild requirements

## Testing Workflow
1. Test backend directly
2. Test nginx proxy
3. Check logs
4. Test in browser
5. Document all test commands

## Cleanup
- Provide `docker-compose down` commands
- Document volume cleanup if needed
- Include troubleshooting for port conflicts
```

---

## Files Modified/Created

### Modified:
- `booking_system_backend/requirements.txt` - Added psycopg2-binary
- `booking_system_backend/db.py` - Added PostgreSQL support
- `booking_system_frontend/src/components/bookings/BookingModal.tsx` - Removed unused imports
- `booking_system_frontend/src/components/flights/FlightCard.tsx` - Removed unused imports

### Created:
- `booking_system_backend/Dockerfile.prod`
- `booking_system_backend/.dockerignore`
- `booking_system_frontend/Dockerfile.prod`
- `booking_system_frontend/nginx.conf`
- `booking_system_frontend/.dockerignore`
- `booking_system_frontend/.env.production`
- `docker-compose.test.yml`
- `TESTING_GUIDE.md`

---

## Time Investment Analysis

| Task | Estimated Time | Actual Time | Reason for Difference |
|------|---------------|-------------|----------------------|
| PostgreSQL Setup | 15 min | 10 min | Straightforward |
| Backend Dockerfile | 10 min | 10 min | As expected |
| Frontend Dockerfile | 15 min | 30 min | TypeScript errors |
| Nginx Configuration | 10 min | 25 min | Path stripping issue |
| Testing | 20 min | 30 min | Port conflicts, debugging |
| **Total** | **70 min** | **105 min** | **+50% due to issues** |

### Lessons:
- Budget 50% extra time for debugging
- Test components individually before integration
- Have troubleshooting commands ready
- Document issues as they occur

---

*Document created: 2026-03-12*
*Phase: 1 - Application Preparation*
*Status: Complete*