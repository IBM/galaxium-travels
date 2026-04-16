#!/usr/bin/env bash

# Galaxium Travels - Simplified IBM Cloud Deployment
# Uses existing Code Engine project and Docker for local builds

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - EDIT THESE
PROJECT_NAME="galaxium-travel-services-maxjesch"
REGION="us-south"
RESOURCE_GROUP="max_jesch_rg"

# App names
BACKEND_APP="galaxium-backend"
FRONTEND_APP="galaxium-frontend"
JAVA_APP="galaxium-hold-service"

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Main deployment
main() {
    print_header "Galaxium Travels - IBM Cloud Deployment"
    
    # 1. Check we're logged in
    print_info "Checking IBM Cloud login..."
    if ! ibmcloud target >/dev/null 2>&1; then
        print_error "Not logged in. Run: ibmcloud login --sso"
        exit 1
    fi
    print_success "Logged in"
    
    # 2. Target environment
    print_info "Targeting: $REGION / $RESOURCE_GROUP"
    ibmcloud target -r "$REGION" -g "$RESOURCE_GROUP"
    
    # 3. Select project
    print_info "Selecting project: $PROJECT_NAME"
    ibmcloud ce project select -n "$PROJECT_NAME"
    print_success "Project selected"
    
    # 4. Build images locally
    print_header "Building Docker Images Locally"
    
    print_info "Building backend..."
    docker build --platform linux/amd64 -t galaxium-backend:latest ./booking_system_backend
    
    print_info "Building frontend..."
    docker build --platform linux/amd64 -t galaxium-frontend:latest ./booking_system_frontend
    
    print_info "Building Java service..."
    print_warning "This takes 5-7 minutes (Maven build)..."
    docker build --platform linux/amd64 -t galaxium-hold-service:latest ./inventory_hold_service
    
    print_success "All images built"
    
    # 5. Deploy using Code Engine build (from local images)
    print_header "Deploying to Code Engine"
    
    # Deploy backend
    print_info "Deploying backend..."
    if ibmcloud ce application get -n "$BACKEND_APP" >/dev/null 2>&1; then
        # Update existing
        ibmcloud ce application update \
            --name "$BACKEND_APP" \
            --build-source . \
            --build-context-dir booking_system_backend \
            --cpu 0.25 \
            --memory 0.5G \
            --port 8080 \
            --min-scale 0 \
            --max-scale 3 \
            --env SEED_DEMO_DATA=true \
            --wait
    else
        # Create new
        ibmcloud ce application create \
            --name "$BACKEND_APP" \
            --build-source . \
            --build-context-dir booking_system_backend \
            --cpu 0.25 \
            --memory 0.5G \
            --port 8080 \
            --min-scale 0 \
            --max-scale 3 \
            --env SEED_DEMO_DATA=true \
            --wait
    fi
    
    BACKEND_URL=$(ibmcloud ce application get -n "$BACKEND_APP" --output json | jq -r '.status.url')
    print_success "Backend deployed: $BACKEND_URL"
    
    # Deploy Java service
    print_info "Deploying Java hold service..."
    local backend_cluster_url="http://${BACKEND_APP}.${PROJECT_NAME}.svc.cluster.local"

    if ibmcloud ce application get -n "$JAVA_APP" >/dev/null 2>&1; then
        ibmcloud ce application update \
            --name "$JAVA_APP" \
            --build-source . \
            --build-context-dir inventory_hold_service \
            --cpu 0.5 \
            --memory 1G \
            --port 8080 \
            --min-scale 0 \
            --max-scale 3 \
            --env PYTHON_BACKEND_URL="$backend_cluster_url" \
            --wait
    else
        ibmcloud ce application create \
            --name "$JAVA_APP" \
            --build-source . \
            --build-context-dir inventory_hold_service \
            --cpu 0.5 \
            --memory 1G \
            --port 8080 \
            --min-scale 0 \
            --max-scale 3 \
            --env PYTHON_BACKEND_URL="$backend_cluster_url" \
            --wait
    fi
    
    JAVA_URL=$(ibmcloud ce application get -n "$JAVA_APP" --output json | jq -r '.status.url')
    print_success "Java service deployed: $JAVA_URL"
    
    # Update backend with Java URL
    print_info "Configuring backend to use Java service..."
    local java_cluster_url="http://${JAVA_APP}.${PROJECT_NAME}.svc.cluster.local"
    ibmcloud ce application update \
        --name "$BACKEND_APP" \
        --env JAVA_SERVICE_URL="$java_cluster_url" \
        --wait
    
    # Deploy frontend
    print_info "Deploying frontend..."
    if ibmcloud ce application get -n "$FRONTEND_APP" >/dev/null 2>&1; then
        ibmcloud ce application update \
            --name "$FRONTEND_APP" \
            --build-source . \
            --build-context-dir booking_system_frontend \
            --cpu 0.25 \
            --memory 0.5G \
            --port 8080 \
            --min-scale 0 \
            --max-scale 3 \
            --wait
    else
        ibmcloud ce application create \
            --name "$FRONTEND_APP" \
            --build-source . \
            --build-context-dir booking_system_frontend \
            --cpu 0.25 \
            --memory 0.5G \
            --port 8080 \
            --min-scale 0 \
            --max-scale 3 \
            --wait
    fi
    
    FRONTEND_URL=$(ibmcloud ce application get -n "$FRONTEND_APP" --output json | jq -r '.status.url')
    print_success "Frontend deployed: $FRONTEND_URL"
    
    # Update CORS
    print_info "Configuring CORS..."
    ibmcloud ce application update \
        --name "$BACKEND_APP" \
        --env CORS_ORIGINS="$FRONTEND_URL,https://$FRONTEND_URL" \
        --wait
    
    # Done!
    print_header "Deployment Complete!"
    echo -e "${GREEN}✓ All services deployed${NC}\n"
    echo -e "${BLUE}URLs:${NC}"
    echo -e "  Frontend:     $FRONTEND_URL"
    echo -e "  Backend:      $BACKEND_URL/api/"
    echo -e "  Java Service: $JAVA_URL/api/v1/"
    echo ""
    echo -e "${YELLOW}Note:${NC} First request may take 10-30 seconds (cold start)"
    echo ""
}

main

# Made with Bob