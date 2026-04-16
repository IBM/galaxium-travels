#!/usr/bin/env bash

# Galaxium Travels Booking System - IBM Cloud Code Engine Teardown Script
# This script safely tears down all Code Engine applications

# NOTE: We don't use 'set -e' here because we want to continue cleanup even if some steps fail

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
APP_PREFIX="${APP_PREFIX:-}"

# Application names
BACKEND_APP="${APP_PREFIX}galaxium-backend"
FRONTEND_APP="${APP_PREFIX}galaxium-frontend"
JAVA_APP="${APP_PREFIX}galaxium-hold-service"

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

confirm_teardown() {
    print_header "⚠️  WARNING: This will delete all applications"
    
    echo -e "${RED}This action will:${NC}"
    echo "  • Delete the backend application ($BACKEND_APP)"
    echo "  • Delete the frontend application ($FRONTEND_APP)"
    echo "  • Delete the Java hold service ($JAVA_APP)"
    echo "  • Applications will scale to zero (no running instances)"
    echo ""
    echo -e "${YELLOW}Note: This will NOT delete:${NC}"
    echo "  • The Code Engine project"
    echo "  • Container images in IBM Container Registry"
    echo "  • Any data or configurations"
    echo ""
    echo -e "${GREEN}Cost Impact:${NC}"
    echo "  • Applications scaled to zero: \$0/month compute cost"
    echo "  • You can redeploy anytime with ./deploy-to-ibm.sh"
    echo ""
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Teardown cancelled"
        exit 0
    fi
    
    print_warning "Starting teardown in 3 seconds... (Press Ctrl+C to cancel)"
    sleep 3
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check for IBM Cloud CLI
    if ! command -v ibmcloud >/dev/null 2>&1; then
        print_error "IBM Cloud CLI not found"
        exit 1
    fi
    
    print_success "IBM Cloud CLI is available"
    
    # Check IBM Cloud login
    if ! ibmcloud target >/dev/null 2>&1; then
        print_error "Not logged in to IBM Cloud"
        exit 1
    fi
    
    print_success "Logged in to IBM Cloud"
}

target_environment() {
    print_header "Targeting IBM Cloud Environment"
    
    print_info "Targeting region: $REGION"
    ibmcloud target -r "$REGION" >/dev/null 2>&1
    
    print_info "Targeting resource group: $RESOURCE_GROUP"
    ibmcloud target -g "$RESOURCE_GROUP" >/dev/null 2>&1
    
    print_info "Selecting project: $PROJECT_NAME"
    if ! ibmcloud ce project select -n "$PROJECT_NAME" >/dev/null 2>&1; then
        print_error "Project '$PROJECT_NAME' not found"
        exit 1
    fi
    
    print_success "Environment targeted"
}

delete_applications() {
    print_header "Deleting Applications"
    
    # Delete backend
    print_info "Deleting backend application: $BACKEND_APP"
    if ibmcloud ce application delete -n "$BACKEND_APP" -f >/dev/null 2>&1; then
        print_success "Backend application deleted"
    else
        print_warning "Backend application not found or already deleted"
    fi
    
    # Delete frontend
    print_info "Deleting frontend application: $FRONTEND_APP"
    if ibmcloud ce application delete -n "$FRONTEND_APP" -f >/dev/null 2>&1; then
        print_success "Frontend application deleted"
    else
        print_warning "Frontend application not found or already deleted"
    fi
    
    # Delete Java service
    print_info "Deleting Java hold service: $JAVA_APP"
    if ibmcloud ce application delete -n "$JAVA_APP" -f >/dev/null 2>&1; then
        print_success "Java hold service deleted"
    else
        print_warning "Java hold service not found or already deleted"
    fi
}

verify_cleanup() {
    print_header "Verifying Cleanup"
    
    print_info "Checking remaining applications..."
    
    local remaining_apps=$(ibmcloud ce application list --output json 2>/dev/null | jq -r '.[].name' | grep -E "^${APP_PREFIX}galaxium-" || true)
    
    if [ -z "$remaining_apps" ]; then
        print_success "All Galaxium applications removed"
    else
        print_warning "Some applications may still exist:"
        echo "$remaining_apps"
    fi
}

print_summary() {
    print_header "Teardown Summary"
    
    echo -e "${GREEN}✓ Teardown completed!${NC}\n"
    echo -e "${BLUE}What was removed:${NC}"
    echo "  ✓ Backend application"
    echo "  ✓ Frontend application"
    echo "  ✓ Java hold service"
    echo ""
    echo -e "${YELLOW}What was preserved:${NC}"
    echo "  • Code Engine project ($PROJECT_NAME)"
    echo "  • Container images in IBM Container Registry"
    echo "  • Source code in this repository"
    echo "  • All configurations"
    echo ""
    echo -e "${BLUE}Cost Impact:${NC}"
    echo "  • Compute: \$0/month (no running applications)"
    echo "  • Storage: ~\$5/month (container images)"
    echo ""
    echo -e "${BLUE}To redeploy:${NC}"
    echo "  ./deploy-to-ibm.sh"
    echo ""
    echo -e "${BLUE}To delete container images (optional):${NC}"
    echo "  ibmcloud cr image-rm us.icr.io/galaxium/galaxium-backend:latest"
    echo "  ibmcloud cr image-rm us.icr.io/galaxium/galaxium-frontend:latest"
    echo "  ibmcloud cr image-rm us.icr.io/galaxium/galaxium-hold-service:latest"
    echo ""
    echo -e "${BLUE}To delete the entire project (optional):${NC}"
    echo "  ibmcloud ce project delete -n $PROJECT_NAME -f"
    echo ""
}

# Main execution
main() {
    print_header "Galaxium Travels - IBM Cloud Code Engine Teardown"
    
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Project: $PROJECT_NAME"
    echo "  Region: $REGION"
    echo "  Resource Group: $RESOURCE_GROUP"
    if [ -n "$APP_PREFIX" ]; then
        echo "  App Prefix: $APP_PREFIX"
    fi
    echo ""
    
    confirm_teardown
    check_prerequisites
    target_environment
    delete_applications
    verify_cleanup
    print_summary
}

# Run main function
main

# Made with Bob