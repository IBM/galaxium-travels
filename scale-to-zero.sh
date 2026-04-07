#!/bin/bash

# Galaxium Travels - Manual Scale to Zero Script
# This script scales ECS services to zero for cost savings

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Galaxium Travels - Scale to Zero${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get cluster name from Terraform
cd terraform
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "galaxium-booking-cluster")
AWS_REGION=$(terraform output -json | jq -r '.aws_region.value // "us-east-1"')
cd ..

echo -e "${BLUE}ℹ Cluster: ${CLUSTER_NAME}${NC}"
echo -e "${BLUE}ℹ Region: ${AWS_REGION}${NC}"
echo ""

# Confirm action
read -p "This will scale both frontend and backend services to zero. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}✗ Operation cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Scaling Services to Zero${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Scale backend to zero
echo -e "${BLUE}ℹ Scaling backend service to zero...${NC}"
aws ecs update-service \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --service galaxium-booking-backend \
    --desired-count 0 \
    --query 'service.[serviceName,desiredCount,runningCount]' \
    --output table

echo ""

# Scale frontend to zero
echo -e "${BLUE}ℹ Scaling frontend service to zero...${NC}"
aws ecs update-service \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --service galaxium-booking-frontend \
    --desired-count 0 \
    --query 'service.[serviceName,desiredCount,runningCount]' \
    --output table

echo ""
echo -e "${GREEN}✓ Services scaled to zero${NC}"
echo ""
echo -e "${BLUE}ℹ Note: RDS database is still running and incurring costs${NC}"
echo -e "${BLUE}ℹ To stop all costs, run: ./teardown-aws.sh${NC}"
echo ""
echo -e "${BLUE}ℹ To scale back up, run: ./scale-up.sh${NC}"

# Made with Bob
