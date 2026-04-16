#!/usr/bin/env bash
# Test script for Phase 2: Application Containerization
# This script builds and tests the Docker containers locally

set -e  # Exit on error

echo "🚀 Phase 2: Testing Containerized Application"
echo "=============================================="
echo ""

# Step 1: Build images
echo "📦 Step 1: Building Docker images..."
echo "Building backend image..."
cd booking_system_backend
docker build --platform linux/amd64 -t galaxium-backend:latest . > /dev/null
cd ..

echo "Building frontend image..."
cd booking_system_frontend
docker build --platform linux/amd64 -t galaxium-frontend:latest . > /dev/null
cd ..

echo "✅ Images built successfully"
echo ""

# Step 2: Start services
echo "🐳 Step 2: Starting services with docker-compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy (30 seconds)..."
sleep 30

# Step 3: Test services
echo ""
echo "🧪 Step 3: Testing services..."
echo ""

# Test backend health
echo "Testing backend health endpoint..."
BACKEND_HEALTH=$(curl -s http://localhost:8080/)
if [[ $BACKEND_HEALTH == *"OK"* ]]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Test backend API
echo "Testing backend /flights endpoint..."
FLIGHTS=$(curl -s http://localhost:8080/flights)
if [[ $FLIGHTS == *"flight_id"* ]]; then
    echo "✅ Backend API working ($(echo $FLIGHTS | grep -o '"flight_id"' | wc -l | tr -d ' ') flights found)"
else
    echo "❌ Backend API failed"
    docker-compose logs backend
    exit 1
fi

# Test frontend
echo "Testing frontend..."
FRONTEND=$(curl -s http://localhost:3000/)
if [[ $FRONTEND == *"<div id=\"root\">"* ]]; then
    echo "✅ Frontend serving correctly"
else
    echo "❌ Frontend failed"
    docker-compose logs frontend
    exit 1
fi

# Test frontend health
echo "Testing frontend health endpoint..."
FRONTEND_HEALTH=$(curl -s http://localhost:3000/health)
if [[ $FRONTEND_HEALTH == "healthy" ]]; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Test API proxy through frontend
echo "Testing API proxy (frontend -> backend)..."
API_PROXY=$(curl -s http://localhost:3000/api/flights)
if [[ $API_PROXY == *"flight_id"* ]]; then
    echo "✅ API proxy working correctly"
else
    echo "❌ API proxy failed"
    docker-compose logs frontend
    docker-compose logs backend
    exit 1
fi

# Show container status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "✅ All tests passed!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080"
echo "   API Docs: http://localhost:8080/docs"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop:      docker-compose down"
echo "🗑️  To cleanup:   docker-compose down -v"

# Made with Bob
