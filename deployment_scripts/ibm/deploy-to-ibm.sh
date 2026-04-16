#!/usr/bin/env bash

# Galaxium Travels Booking System - IBM Cloud Code Engine Deployment Script
# This script deploys the complete application to IBM Cloud Code Engine

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-galaxium-travel-services-maxjesch}"
REGION="${REGION:-us-south}"
RESOURCE_GROUP="${RESOURCE_GROUP:-max_jesch_rg}"
REGISTRY_NAMESPACE="${REGISTRY_NAMESPACE:-galaxium}"
APP_PREFIX="${APP_PREFIX:-}"  # Optional prefix for app names (e.g., "max-" for shared environments)

# Application names
BACKEND_APP="${APP_PREFIX}galaxium-backend"
FRONTEND_APP="${APP_PREFIX}galaxium-frontend"
JAVA_APP="${APP_PREFIX}galaxium-hold-service"

# Resource allocation (right-sized for demo)
BACKEND_CPU="0.25"
BACKEND_MEMORY="0.5G"
FRONTEND_CPU="0.25"
FRONTEND_MEMORY="0.5G"
JAVA_CPU="0.5"
JAVA_MEMORY="1G"

# Scaling configuration
MIN_SCALE="0"  # Scale to zero for cost savings
MAX_SCALE="3"
BACKEND_SCALE_DOWN_DELAY="1800"  # 30 minutes — keeps backend warm after last request
JAVA_SCALE_DOWN_DELAY="1800"     # 30 minutes — keeps hold service warm after last request

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check for required tools
    command -v ibmcloud >/dev/null 2>&1 || missing_tools+=("ibmcloud-cli")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Install IBM Cloud CLI:"
        echo "  curl -fsSL https://clis.cloud.ibm.com/install/osx | sh"
        echo ""
        echo "Install Code Engine plugin:"
        echo "  ibmcloud plugin install code-engine"
        echo "  ibmcloud plugin install container-registry"
        exit 1
    fi
    
    print_success "All required tools are installed"
    
    # Check IBM Cloud login
    if ! ibmcloud target >/dev/null 2>&1; then
        print_error "Not logged in to IBM Cloud"
        echo "Please run 'ibmcloud login' or 'ibmcloud login --sso' and try again."
        exit 1
    fi
    
    print_success "Logged in to IBM Cloud"
    
    # Check Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        echo "Please start Docker and try again."
        exit 1
    fi
    
    print_success "Docker is running"
    
    # Check Code Engine plugin
    if ! ibmcloud plugin list | grep -qw "code-engine"; then
        print_error "Code Engine plugin not installed"
        echo "Install with: ibmcloud plugin install code-engine"
        exit 1
    fi
    
    print_success "Code Engine plugin installed"
}

target_environment() {
    print_header "Targeting IBM Cloud Environment"
    
    print_info "Targeting region: $REGION"
    ibmcloud target -r "$REGION"
    
    print_info "Targeting resource group: $RESOURCE_GROUP"
    ibmcloud target -g "$RESOURCE_GROUP"
    
    print_success "Environment targeted"
}

select_project() {
    print_header "Selecting Code Engine Project"
    
    print_info "Selecting project: $PROJECT_NAME"
    
    if ! ibmcloud ce project select -n "$PROJECT_NAME" 2>/dev/null; then
        print_warning "Project '$PROJECT_NAME' not found"
        read -p "Would you like to create it? (y/n): " create_project
        
        if [ "$create_project" = "y" ]; then
            print_info "Creating project: $PROJECT_NAME"
            ibmcloud ce project create -n "$PROJECT_NAME"
            ibmcloud ce project select -n "$PROJECT_NAME"
            print_success "Project created and selected"
        else
            print_error "Cannot proceed without a project"
            exit 1
        fi
    else
        print_success "Project selected: $PROJECT_NAME"
    fi
}

setup_container_registry() {
    print_header "Setting Up Container Registry"
    
    # Get registry region
    local registry_region
    case "$REGION" in
        us-south|us-east)
            registry_region="us"
            ;;
        eu-de|eu-gb)
            registry_region="de"
            ;;
        *)
            registry_region="us"
            ;;
    esac
    
    print_info "Using registry region: $registry_region"
    
    # Check if namespace exists
    if ! ibmcloud cr namespace-list | grep -qw "$REGISTRY_NAMESPACE"; then
        print_info "Creating registry namespace: $REGISTRY_NAMESPACE"
        ibmcloud cr namespace-add "$REGISTRY_NAMESPACE"
        print_success "Registry namespace created"
    else
        print_info "Registry namespace already exists: $REGISTRY_NAMESPACE"
    fi
    
    # Login to registry
    print_info "Logging in to IBM Container Registry..."
    ibmcloud cr login
    
    print_success "Container Registry ready"
    
    # Export registry URL for use in other functions
    export REGISTRY_URL="${registry_region}.icr.io/${REGISTRY_NAMESPACE}"
}

build_and_push_backend() {
    print_header "Building and Pushing Backend Image"
    
    cd booking_system_backend
    
    local image_name="${REGISTRY_URL}/galaxium-backend:latest"
    
    print_info "Building backend Docker image..."
    docker build --platform linux/amd64 -t "$image_name" .
    
    print_info "Pushing image to IBM Container Registry..."
    docker push "$image_name"
    
    print_success "Backend image pushed: $image_name"
    
    cd ..
    
    export BACKEND_IMAGE="$image_name"
}

build_and_push_frontend() {
    print_header "Building and Pushing Frontend Image"
    
    cd booking_system_frontend
    
    local image_name="${REGISTRY_URL}/galaxium-frontend:latest"
    
    print_info "Building frontend Docker image..."
    docker build --platform linux/amd64 -t "$image_name" .
    
    print_info "Pushing image to IBM Container Registry..."
    docker push "$image_name"
    
    print_success "Frontend image pushed: $image_name"
    
    cd ..
    
    export FRONTEND_IMAGE="$image_name"
}

build_and_push_java_service() {
    print_header "Building and Pushing Java Hold Service Image"
    
    cd inventory_hold_service
    
    local image_name="${REGISTRY_URL}/galaxium-hold-service:latest"
    
    print_info "Building Java service Docker image..."
    print_warning "This may take a few minutes (Maven build inside Docker)..."
    docker build --platform linux/amd64 -t "$image_name" .
    
    print_info "Pushing image to IBM Container Registry..."
    docker push "$image_name"
    
    print_success "Java service image pushed: $image_name"
    
    cd ..
    
    export JAVA_IMAGE="$image_name"
}

create_registry_access() {
    print_header "Setting Up Registry Access"
    
    # Check for manually-created registry secret first (has explicit namespace access)
    local preferred_secret="galaxium-icr-secret"

    if ibmcloud ce registry get --name "$preferred_secret" >/dev/null 2>&1; then
        print_info "Using existing registry secret: $preferred_secret"
        export REGISTRY_SECRET="$preferred_secret"
        return 0
    fi

    # Fallback: auto-created secret
    local auto_secret="ce-auto-icr-private-${REGION}"

    if ibmcloud ce registry get --name "$auto_secret" >/dev/null 2>&1; then
        print_info "Using existing auto-created registry secret: $auto_secret"
        export REGISTRY_SECRET="$auto_secret"
        return 0
    fi

    # Last resort: create a new secret
    local secret_name="galaxium-icr-secret"
    
    if ibmcloud ce registry get --name "$secret_name" >/dev/null 2>&1; then
        print_info "Using existing registry secret: $secret_name"
        export REGISTRY_SECRET="$secret_name"
        return 0
    fi
    
    print_info "Creating registry access secret..."
    print_warning "This requires creating an IBM Cloud API key"
    
    # Create registry secret using current credentials
    if ibmcloud ce registry create \
        --name "$secret_name" \
        --server "${REGISTRY_URL%%/*}" \
        --username iamapikey \
        --password "$(ibmcloud iam api-key-create ce-registry-key -d 'Code Engine registry access' --output json 2>/dev/null | jq -r '.apikey')" \
        >/dev/null 2>&1; then
        print_success "Registry secret created"
        export REGISTRY_SECRET="$secret_name"
    else
        print_error "Failed to create registry secret"
        print_info "You may need to create an API key manually"
        exit 1
    fi
}

deploy_backend() {
    print_header "Deploying Backend Application"
    
    # Check if app exists
    if ibmcloud ce application get -n "$BACKEND_APP" >/dev/null 2>&1; then
        print_info "Updating existing backend application..."
        ibmcloud ce application update \
            --name "$BACKEND_APP" \
            --image "$BACKEND_IMAGE" \
            --registry-secret "$REGISTRY_SECRET" \
            --cpu "$BACKEND_CPU" \
            --memory "$BACKEND_MEMORY" \
            --port 8080 \
            --min-scale "$MIN_SCALE" \
            --max-scale "$MAX_SCALE" \
            --scale-down-delay "$BACKEND_SCALE_DOWN_DELAY" \
            --env SEED_DEMO_DATA=true \
            --wait
    else
        print_info "Creating new backend application..."
        ibmcloud ce application create \
            --name "$BACKEND_APP" \
            --image "$BACKEND_IMAGE" \
            --registry-secret "$REGISTRY_SECRET" \
            --cpu "$BACKEND_CPU" \
            --memory "$BACKEND_MEMORY" \
            --port 8080 \
            --min-scale "$MIN_SCALE" \
            --max-scale "$MAX_SCALE" \
            --scale-down-delay "$BACKEND_SCALE_DOWN_DELAY" \
            --env SEED_DEMO_DATA=true \
            --wait
    fi
    
    # Get backend URL
    BACKEND_URL=$(ibmcloud ce application get -n "$BACKEND_APP" --output json | jq -r '.status.url')
    print_success "Backend deployed: $BACKEND_URL"
    
    export BACKEND_URL
}

deploy_java_service() {
    print_header "Deploying Java Hold Service"
    
    # In Code Engine, apps in the same project are reachable by app name alone
    local backend_cluster_url="http://${BACKEND_APP}"
    
    # Check if app exists
    if ibmcloud ce application get -n "$JAVA_APP" >/dev/null 2>&1; then
        print_info "Updating existing Java service..."
        ibmcloud ce application update \
            --name "$JAVA_APP" \
            --image "$JAVA_IMAGE" \
            --registry-secret "$REGISTRY_SECRET" \
            --cpu "$JAVA_CPU" \
            --memory "$JAVA_MEMORY" \
            --port 8080 \
            --min-scale "$MIN_SCALE" \
            --max-scale "$MAX_SCALE" \
            --scale-down-delay "$JAVA_SCALE_DOWN_DELAY" \
            --visibility project \
            --env PYTHON_BACKEND_URL="$backend_cluster_url" \
            --wait
    else
        print_info "Creating new Java service..."
        ibmcloud ce application create \
            --name "$JAVA_APP" \
            --image "$JAVA_IMAGE" \
            --registry-secret "$REGISTRY_SECRET" \
            --cpu "$JAVA_CPU" \
            --memory "$JAVA_MEMORY" \
            --port 8080 \
            --min-scale "$MIN_SCALE" \
            --max-scale "$MAX_SCALE" \
            --scale-down-delay "$JAVA_SCALE_DOWN_DELAY" \
            --visibility project \
            --env PYTHON_BACKEND_URL="$backend_cluster_url" \
            --wait
    fi
    
    # Get Java service URL
    JAVA_URL=$(ibmcloud ce application get -n "$JAVA_APP" --output json | jq -r '.status.url')
    print_success "Java service deployed: $JAVA_URL"
    
    export JAVA_URL
}

update_backend_with_java_url() {
    print_header "Updating Backend with Java Service URL"
    
    # In Code Engine, apps in the same project are reachable by app name alone
    local java_cluster_url="http://${JAVA_APP}"

    print_info "Configuring backend to use Java service at: $java_cluster_url"

    ibmcloud ce application update \
        --name "$BACKEND_APP" \
        --env JAVA_SERVICE_URL="$java_cluster_url" \
        --wait
    
    print_success "Backend updated with Java service URL"
}

deploy_frontend() {
    print_header "Deploying Frontend Application"
    
    # Frontend uses relative /api paths, so no backend URL needed
    # The routing is handled by Code Engine's built-in routing
    
    # Check if app exists
    if ibmcloud ce application get -n "$FRONTEND_APP" >/dev/null 2>&1; then
        print_info "Updating existing frontend application..."
        ibmcloud ce application update \
            --name "$FRONTEND_APP" \
            --image "$FRONTEND_IMAGE" \
            --registry-secret "$REGISTRY_SECRET" \
            --cpu "$FRONTEND_CPU" \
            --memory "$FRONTEND_MEMORY" \
            --port 8080 \
            --min-scale "$MIN_SCALE" \
            --max-scale "$MAX_SCALE" \
            --wait
    else
        print_info "Creating new frontend application..."
        ibmcloud ce application create \
            --name "$FRONTEND_APP" \
            --image "$FRONTEND_IMAGE" \
            --registry-secret "$REGISTRY_SECRET" \
            --cpu "$FRONTEND_CPU" \
            --memory "$FRONTEND_MEMORY" \
            --port 8080 \
            --min-scale "$MIN_SCALE" \
            --max-scale "$MAX_SCALE" \
            --wait
    fi
    
    # Get frontend URL
    FRONTEND_URL=$(ibmcloud ce application get -n "$FRONTEND_APP" --output json | jq -r '.status.url')
    print_success "Frontend deployed: $FRONTEND_URL"
    
    export FRONTEND_URL
}

update_backend_cors() {
    print_header "Updating Backend CORS Configuration"
    
    print_info "Configuring CORS for frontend URL: $FRONTEND_URL"
    
    ibmcloud ce application update \
        --name "$BACKEND_APP" \
        --env CORS_ORIGINS="$FRONTEND_URL" \
        --wait
    
    print_success "CORS configuration updated"
}

wait_for_applications() {
    print_header "Waiting for Applications to Be Ready"
    
    print_info "This may take 1-2 minutes for first deployment..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local backend_ready=$(ibmcloud ce application get -n "$BACKEND_APP" --output json 2>/dev/null | jq -r '.status.conditions[] | select(.type=="Ready") | .status' || echo "False")
        local frontend_ready=$(ibmcloud ce application get -n "$FRONTEND_APP" --output json 2>/dev/null | jq -r '.status.conditions[] | select(.type=="Ready") | .status' || echo "False")
        local java_ready=$(ibmcloud ce application get -n "$JAVA_APP" --output json 2>/dev/null | jq -r '.status.conditions[] | select(.type=="Ready") | .status' || echo "False")
        
        if [ "$backend_ready" = "True" ] && [ "$frontend_ready" = "True" ] && [ "$java_ready" = "True" ]; then
            print_success "All applications are ready"
            return 0
        fi
        
        echo -n "."
        sleep 5
        ((++attempt))
    done
    
    echo ""
    print_warning "Timeout waiting for applications. Check status manually."
}

validate_deployment() {
    print_header "Validating Deployment"
    
    print_info "Waiting for applications to warm up..."
    sleep 10
    
    # Test backend API
    print_info "Testing backend API..."
    backend_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/" || echo "000")
    
    if [ "$backend_status" = "200" ]; then
        print_success "Backend API is responding (HTTP $backend_status)"
    else
        print_warning "Backend API returned HTTP $backend_status (may need more time to start)"
    fi
    
    # Test Java service
    print_info "Testing Java hold service..."
    java_status=$(curl -s -o /dev/null -w "%{http_code}" "$JAVA_URL/api/v1/health" || echo "000")
    
    if [ "$java_status" = "200" ]; then
        print_success "Java service is responding (HTTP $java_status)"
    else
        print_warning "Java service returned HTTP $java_status (may need more time to start)"
    fi
    
    # Test frontend
    print_info "Testing frontend..."
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/" || echo "000")
    
    if [ "$frontend_status" = "200" ]; then
        print_success "Frontend is responding (HTTP $frontend_status)"
    else
        print_warning "Frontend returned HTTP $frontend_status (may need more time to start)"
    fi
}

print_summary() {
    print_header "Deployment Summary"
    
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}\n"
    echo -e "${BLUE}Application URLs:${NC}"
    echo -e "  Frontend:     $FRONTEND_URL"
    echo -e "  Backend API:  $BACKEND_URL/api/"
    echo -e "  Java Service: $JAVA_URL/api/v1/"
    echo ""
    echo -e "${BLUE}Architecture:${NC}"
    echo -e "  Frontend → Backend → Java Hold Service"
    echo -e "  All services scale to zero when idle (cost savings)"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Open the frontend URL in your browser"
    echo "2. Test the booking functionality"
    echo "3. Try the B2B quote/hold workflow"
    echo ""
    echo -e "${YELLOW}To view logs:${NC}"
    echo "  ibmcloud ce application logs -f -n $BACKEND_APP"
    echo "  ibmcloud ce application logs -f -n $FRONTEND_APP"
    echo "  ibmcloud ce application logs -f -n $JAVA_APP"
    echo ""
    echo -e "${YELLOW}To check application status:${NC}"
    echo "  ibmcloud ce application list"
    echo "  ibmcloud ce application get -n $BACKEND_APP"
    echo ""
    echo -e "${YELLOW}To update an application:${NC}"
    echo "  ./deploy-to-ibm.sh  # Re-run this script"
    echo ""
    echo -e "${YELLOW}To tear down:${NC}"
    echo "  ./teardown-ibm.sh"
    echo ""
    echo -e "${BLUE}Cost Estimate:${NC}"
    echo "  Idle (scaled to zero): \$0/month"
    echo "  Light usage: ~\$5-10/month"
    echo "  Medium usage: ~\$20-30/month"
    echo ""
}

# Main execution
main() {
    print_header "Galaxium Travels - IBM Cloud Code Engine Deployment"
    
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Project: $PROJECT_NAME"
    echo "  Region: $REGION"
    echo "  Resource Group: $RESOURCE_GROUP"
    echo "  Registry Namespace: $REGISTRY_NAMESPACE"
    if [ -n "$APP_PREFIX" ]; then
        echo "  App Prefix: $APP_PREFIX"
    fi
    echo ""
    
    check_prerequisites
    target_environment
    select_project
    setup_container_registry
    create_registry_access
    
    # Build and push all images
    build_and_push_backend
    build_and_push_java_service
    build_and_push_frontend
    
    # Deploy applications in order
    deploy_backend
    deploy_java_service
    update_backend_with_java_url
    deploy_frontend
    update_backend_cors
    
    # Validate
    wait_for_applications
    validate_deployment
    print_summary
}

# Run main function
main

# Made with Bob