#!/usr/bin/env bash

# Galaxium Travels Booking System - AWS Deployment Script
# This script deploys the complete application to AWS ECS

set -e  # Exit on error

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

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check for required tools
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v terraform >/dev/null 2>&1 || missing_tools+=("terraform")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    print_success "All required tools are installed"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured"
        echo "Please run 'aws configure' to set up your credentials."
        exit 1
    fi
    
    print_success "AWS credentials are configured"
    
    # Check Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        echo "Please start Docker and try again."
        exit 1
    fi
    
    print_success "Docker is running"
}

create_terraform_vars() {
    print_header "Creating Terraform Variables"
    
    if [ ! -f terraform/terraform.tfvars ]; then
        print_info "Creating terraform.tfvars from example..."
        cp terraform/terraform.tfvars.example terraform/terraform.tfvars
        print_success "Created terraform.tfvars"
        print_warning "Please review terraform/terraform.tfvars and adjust values if needed"
    else
        print_info "terraform.tfvars already exists"
    fi
}

deploy_infrastructure() {
    print_header "Deploying Infrastructure with Terraform"
    
    cd terraform
    
    print_info "Initializing Terraform..."
    terraform init
    
    print_info "Planning infrastructure changes..."
    terraform plan -out=tfplan
    
    print_info "Applying infrastructure changes..."
    terraform apply tfplan
    
    rm -f tfplan
    
    print_success "Infrastructure deployed successfully"
    
    cd ..
}

get_terraform_outputs() {
    print_header "Getting Terraform Outputs"
    
    cd terraform
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)
    ECR_FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
    ALB_URL=$(terraform output -raw alb_url)
    ECS_CLUSTER=$(terraform output -raw ecs_cluster_name)
    
    cd ..
    
    print_success "Retrieved Terraform outputs"
    print_info "Backend ECR: $ECR_BACKEND_REPO"
    print_info "Frontend ECR: $ECR_FRONTEND_REPO"
    print_info "Application URL: $ALB_URL"
}

authenticate_ecr() {
    print_header "Authenticating with ECR"
    
    print_info "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin \
        "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    print_success "Authenticated with ECR"
}

build_and_push_backend() {
    print_header "Building and Pushing Backend Image"
    
    cd booking_system_backend
    
    print_info "Building backend Docker image..."
    docker build --platform linux/amd64 -t "$PROJECT_NAME-backend:latest" .
    
    print_info "Tagging image for ECR..."
    docker tag "$PROJECT_NAME-backend:latest" "$ECR_BACKEND_REPO:latest"
    
    print_info "Pushing image to ECR..."
    docker push "$ECR_BACKEND_REPO:latest"
    
    # Get image digest
    BACKEND_DIGEST=$(aws ecr describe-images \
        --repository-name "$PROJECT_NAME-backend" \
        --region "$AWS_REGION" \
        --image-ids imageTag=latest \
        --query 'imageDetails[0].imageDigest' \
        --output text)
    
    print_success "Backend image pushed successfully"
    print_info "Image digest: $BACKEND_DIGEST"
    
    cd ..
}

build_and_push_frontend() {
    print_header "Building and Pushing Frontend Image"
    
    cd booking_system_frontend
    
    print_info "Building frontend Docker image..."
    docker build --platform linux/amd64 -t "$PROJECT_NAME-frontend:latest" .
    
    print_info "Tagging image for ECR..."
    docker tag "$PROJECT_NAME-frontend:latest" "$ECR_FRONTEND_REPO:latest"
    
    print_info "Pushing image to ECR..."
    docker push "$ECR_FRONTEND_REPO:latest"
    
    # Get image digest
    FRONTEND_DIGEST=$(aws ecr describe-images \
        --repository-name "$PROJECT_NAME-frontend" \
        --region "$AWS_REGION" \
        --image-ids imageTag=latest \
        --query 'imageDetails[0].imageDigest' \
        --output text)
    
    print_success "Frontend image pushed successfully"
    print_info "Image digest: $FRONTEND_DIGEST"
    
    cd ..
}

deploy_ecs_services() {
    print_header "Deploying ECS Services"
    
    print_info "Forcing new deployment for backend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$PROJECT_NAME-backend" \
        --region "$AWS_REGION" \
        --force-new-deployment \
        --output text >/dev/null
    
    print_info "Forcing new deployment for frontend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$PROJECT_NAME-frontend" \
        --region "$AWS_REGION" \
        --force-new-deployment \
        --output text >/dev/null
    
    print_success "ECS service deployments initiated"
}

wait_for_services() {
    print_header "Waiting for Services to Become Healthy"
    
    print_info "This may take 2-3 minutes..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        # Check backend service
        backend_running=$(aws ecs describe-services \
            --cluster "$ECS_CLUSTER" \
            --services "$PROJECT_NAME-backend" \
            --region "$AWS_REGION" \
            --query 'services[0].runningCount' \
            --output text)
        
        # Check frontend service
        frontend_running=$(aws ecs describe-services \
            --cluster "$ECS_CLUSTER" \
            --services "$PROJECT_NAME-frontend" \
            --region "$AWS_REGION" \
            --query 'services[0].runningCount' \
            --output text)
        
        if [ "$backend_running" -ge 1 ] && [ "$frontend_running" -ge 1 ]; then
            print_success "Services are running"
            break
        fi
        
        echo -n "."
        sleep 5
        ((attempt++))
    done
    
    echo ""
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "Timeout waiting for services. Check AWS Console for details."
    fi
}

validate_deployment() {
    print_header "Validating Deployment"
    
    print_info "Waiting for ALB to be ready..."
    sleep 10
    
    # Test backend API
    print_info "Testing backend API..."
    backend_status=$(curl -s -o /dev/null -w "%{http_code}" "$ALB_URL/api/" || echo "000")
    
    if [ "$backend_status" = "200" ]; then
        print_success "Backend API is responding (HTTP $backend_status)"
    else
        print_warning "Backend API returned HTTP $backend_status"
    fi
    
    # Test frontend
    print_info "Testing frontend..."
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$ALB_URL/" || echo "000")
    
    if [ "$frontend_status" = "200" ]; then
        print_success "Frontend is responding (HTTP $frontend_status)"
    else
        print_warning "Frontend returned HTTP $frontend_status"
    fi
    
    # Test health endpoint
    print_info "Testing health endpoint..."
    health_status=$(curl -s -o /dev/null -w "%{http_code}" "$ALB_URL/health" || echo "000")
    
    if [ "$health_status" = "200" ]; then
        print_success "Health endpoint is responding (HTTP $health_status)"
    else
        print_warning "Health endpoint returned HTTP $health_status"
    fi
}

print_summary() {
    print_header "Deployment Summary"
    
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}\n"
    echo -e "${BLUE}Application URL:${NC} $ALB_URL"
    echo -e "${BLUE}Backend API:${NC} $ALB_URL/api/"
    echo -e "${BLUE}Health Check:${NC} $ALB_URL/health"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Open the application URL in your browser"
    echo "2. Test the booking functionality"
    echo "3. Monitor CloudWatch logs for any issues"
    echo ""
    echo -e "${YELLOW}To view logs:${NC}"
    echo "  aws logs tail /ecs/$PROJECT_NAME-backend --region $AWS_REGION --follow"
    echo "  aws logs tail /ecs/$PROJECT_NAME-frontend --region $AWS_REGION --follow"
    echo ""
    echo -e "${YELLOW}To tear down the infrastructure:${NC}"
    echo "  ./teardown-aws.sh"
    echo ""
}

# Main execution
main() {
    print_header "Galaxium Travels Booking System - AWS Deployment"
    
    check_prerequisites
    create_terraform_vars
    deploy_infrastructure
    get_terraform_outputs
    authenticate_ecr
    build_and_push_backend
    build_and_push_frontend
    deploy_ecs_services
    wait_for_services
    validate_deployment
    print_summary
}

# Run main function
main

# Made with Bob
