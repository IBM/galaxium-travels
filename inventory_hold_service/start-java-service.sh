#!/bin/bash

# Start Java Hold Service
# This script builds and runs the Java service locally

echo "🚀 Starting Java Hold Service..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java is not installed. Please install Java 17 or higher.${NC}"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo -e "${RED}❌ Java 17 or higher is required. Current version: $JAVA_VERSION${NC}"
    exit 1
fi

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo -e "${RED}❌ Maven is not installed. Please install Maven 3.6 or higher.${NC}"
    exit 1
fi

# Kill any existing process on port 8082
EXISTING_JAVA=$(lsof -ti :8082 2>/dev/null)
if [ -n "$EXISTING_JAVA" ]; then
    echo "Stopping existing Java service on port 8082..."
    echo "$EXISTING_JAVA" | xargs kill -9 2>/dev/null
    sleep 2
fi

# Build the project
echo -e "${BLUE}📦 Building Java service...${NC}"
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Set environment variables
export PYTHON_BACKEND_URL=${PYTHON_BACKEND_URL:-http://localhost:8001}
export SERVER_PORT=8082

# Start the service
echo -e "${BLUE}🚀 Starting Java service...${NC}"
java -jar -Dserver.port=8082 target/inventory-hold-service-1.0.0.jar &
JAVA_PID=$!

# Wait for service to start
echo "Waiting for service to start..."
sleep 5

# Check if service is running
if curl -s http://localhost:8082/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Java Hold Service started successfully!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌟 Java Hold Service is running!"
    echo ""
    echo "   Service:  http://localhost:8082"
    echo "   Health:   http://localhost:8082/api/v1/health"
    echo "   Backend:  $PYTHON_BACKEND_URL"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Wait for the process
    wait $JAVA_PID
else
    echo -e "${RED}❌ Service failed to start. Check the logs above.${NC}"
    kill $JAVA_PID 2>/dev/null
    exit 1
fi

# Made with Bob
