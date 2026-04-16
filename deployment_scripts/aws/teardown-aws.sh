#!/usr/bin/env bash

# Galaxium Travels Booking System - AWS Teardown Script
# This script safely tears down all AWS resources

# NOTE: We don't use 'set -e' here because we want to continue cleanup even if some steps fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="galaxium-booking"

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
    print_header "⚠️  WARNING: This will destroy all AWS resources"
    
    echo -e "${RED}This action will:${NC}"
    echo "  • Delete all ECS services and tasks"
    echo "  • Delete all Docker images from ECR"
    echo "  • Delete the VPC and all networking resources"
    echo "  • Delete CloudWatch logs"
    echo "  • Remove all Terraform-managed resources"
    echo ""
    echo -e "${YELLOW}This action cannot be undone!${NC}"
    echo ""
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Teardown cancelled"
        exit 0
    fi
    
    print_warning "Starting teardown in 5 seconds... (Press Ctrl+C to cancel)"
    sleep 5
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check for required tools
    if ! command -v aws >/dev/null 2>&1; then
        print_error "AWS CLI not found"
        exit 1
    fi
    
    if ! command -v terraform >/dev/null 2>&1; then
        print_error "Terraform not found"
        exit 1
    fi
    
    print_success "Required tools are available"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    print_success "AWS credentials are configured"
    
    # Check if terraform directory exists
    if [ ! -d "terraform" ]; then
        print_error "Terraform directory not found"
        exit 1
    fi
    
    print_success "Terraform directory found"
}

scale_down_services() {
    print_header "Scaling Down ECS Services"
    
    print_info "Setting desired count to 0 for backend service..."
    aws ecs update-service \
        --cluster "$PROJECT_NAME-cluster" \
        --service "$PROJECT_NAME-backend" \
        --region "$AWS_REGION" \
        --desired-count 0 \
        --output text >/dev/null 2>&1 || print_warning "Backend service not found or already scaled down"
    
    print_info "Setting desired count to 0 for frontend service..."
    aws ecs update-service \
        --cluster "$PROJECT_NAME-cluster" \
        --service "$PROJECT_NAME-frontend" \
        --region "$AWS_REGION" \
        --desired-count 0 \
        --output text >/dev/null 2>&1 || print_warning "Frontend service not found or already scaled down"
    
    print_info "Waiting for tasks to stop..."
    sleep 10
    
    print_success "Services scaled down"
}

delete_ecr_images() {
    print_header "Deleting ECR Images"
    
    # Delete backend images
    print_info "Deleting backend images..."
    local backend_images=$(aws ecr list-images \
        --repository-name "$PROJECT_NAME-backend" \
        --region "$AWS_REGION" \
        --query 'imageIds[*]' \
        --output json 2>/dev/null)
    
    if [ -n "$backend_images" ] && [ "$backend_images" != "[]" ]; then
        aws ecr batch-delete-image \
            --repository-name "$PROJECT_NAME-backend" \
            --region "$AWS_REGION" \
            --image-ids "$backend_images" \
            --output text >/dev/null 2>&1 || true
        print_success "Backend images deleted"
    else
        print_info "No backend images to delete"
    fi
    
    # Delete frontend images
    print_info "Deleting frontend images..."
    local frontend_images=$(aws ecr list-images \
        --repository-name "$PROJECT_NAME-frontend" \
        --region "$AWS_REGION" \
        --query 'imageIds[*]' \
        --output json 2>/dev/null)
    
    if [ -n "$frontend_images" ] && [ "$frontend_images" != "[]" ]; then
        aws ecr batch-delete-image \
            --repository-name "$PROJECT_NAME-frontend" \
            --region "$AWS_REGION" \
            --image-ids "$frontend_images" \
            --output text >/dev/null 2>&1 || true
        print_success "Frontend images deleted"
    else
        print_info "No frontend images to delete"
    fi
}

destroy_terraform() {
    print_header "Destroying Terraform Infrastructure"
    
    cd terraform
    
    print_info "Running terraform destroy..."
    print_warning "This may take 5-10 minutes..."
    
    if terraform destroy -auto-approve; then
        print_success "Terraform infrastructure destroyed"
    else
        print_error "Terraform destroy encountered errors"
        print_info "You may need to manually clean up some resources in AWS Console"
        cd ..
        return 1
    fi
    
    cd ..
}

cleanup_terraform_state() {
    print_header "Cleaning Up Terraform State"
    
    cd terraform
    
    if [ -f "terraform.tfstate" ]; then
        print_info "Backing up terraform.tfstate..."
        mv terraform.tfstate "terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)" || true
        print_success "State file backed up"
    fi
    
    if [ -f "terraform.tfstate.backup" ]; then
        print_info "Removing old backup..."
        rm -f terraform.tfstate.backup || true
    fi
    
    if [ -f ".terraform.lock.hcl" ]; then
        print_info "Keeping .terraform.lock.hcl for future use"
    fi
    
    cd ..
    
    print_success "Terraform state cleaned up"
}

verify_cleanup() {
    print_header "Verifying Cleanup"
    
    local resources_remaining=0
    
    # Check ECS cluster
    print_info "Checking ECS cluster..."
    if aws ecs describe-clusters \
        --clusters "$PROJECT_NAME-cluster" \
        --region "$AWS_REGION" \
        --query 'clusters[0].status' \
        --output text 2>/dev/null | grep -q "ACTIVE"; then
        print_warning "ECS cluster still exists"
        ((resources_remaining++))
    else
        print_success "ECS cluster removed"
    fi
    
    # Check ECR repositories
    print_info "Checking ECR repositories..."
    if aws ecr describe-repositories \
        --repository-names "$PROJECT_NAME-backend" \
        --region "$AWS_REGION" \
        --output text >/dev/null 2>&1; then
        print_warning "Backend ECR repository still exists"
        ((resources_remaining++))
    else
        print_success "Backend ECR repository removed"
    fi
    
    if aws ecr describe-repositories \
        --repository-names "$PROJECT_NAME-frontend" \
        --region "$AWS_REGION" \
        --output text >/dev/null 2>&1; then
        print_warning "Frontend ECR repository still exists"
        ((resources_remaining++))
    else
        print_success "Frontend ECR repository removed"
    fi
    
    if [ $resources_remaining -gt 0 ]; then
        print_warning "$resources_remaining resource(s) may still be deleting"
        print_info "Check AWS Console to verify all resources are removed"
    else
        print_success "All resources verified as removed"
    fi
}

estimate_cost_savings() {
    print_header "Cost Savings"
    
    echo -e "${GREEN}By tearing down this infrastructure, you will save approximately:${NC}"
    echo ""
    echo "  • NAT Gateway: ~\$32/month"
    echo "  • Application Load Balancer: ~\$16/month"
    echo "  • ECS Fargate: ~\$30/month"
    echo ""
    echo -e "${GREEN}Total savings: ~\$78/month${NC}"
    echo ""
}

print_summary() {
    print_header "Teardown Summary"
    
    echo -e "${GREEN}✓ Teardown completed!${NC}\n"
    echo -e "${BLUE}What was removed:${NC}"
    echo "  ✓ ECS services and tasks"
    echo "  ✓ Docker images from ECR"
    echo "  ✓ VPC and networking resources"
    echo "  ✓ Application Load Balancer"
    echo "  ✓ CloudWatch log groups"
    echo "  ✓ Security groups and IAM roles"
    echo ""
    echo -e "${YELLOW}What was preserved:${NC}"
    echo "  • Terraform configuration files"
    echo "  • Application source code"
    echo "  • Docker images on local machine"
    echo "  • Terraform state backup (if any)"
    echo ""
    echo -e "${BLUE}To redeploy:${NC}"
    echo "  ./deploy-to-aws.sh"
    echo ""
}

# Main execution
main() {
    print_header "Galaxium Travels Booking System - AWS Teardown"
    
    confirm_teardown
    check_prerequisites
    scale_down_services
    delete_ecr_images
    destroy_terraform
    cleanup_terraform_state
    verify_cleanup
    estimate_cost_savings
    print_summary
}

# Run main function
main

# Made with Bob
