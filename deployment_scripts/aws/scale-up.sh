#!/bin/bash

# Galaxium Travels - Manual Scale Up Script
# This script scales ECS services back up from zero

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Galaxium Travels - Scale Up${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get cluster name from Terraform
cd terraform
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "galaxium-booking-cluster")
AWS_REGION=$(terraform output -json | jq -r '.aws_region.value // "us-east-1"')
DESIRED_COUNT=$(terraform output -json | jq -r '.ecs_desired_count.value // "1"')
cd ..

echo -e "${BLUE}ℹ Cluster: ${CLUSTER_NAME}${NC}"
echo -e "${BLUE}ℹ Region: ${AWS_REGION}${NC}"
echo -e "${BLUE}ℹ Desired Count: ${DESIRED_COUNT}${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Scaling Services Up${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Scale backend up
echo -e "${BLUE}ℹ Scaling backend service to ${DESIRED_COUNT}...${NC}"
aws ecs update-service \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --service galaxium-booking-backend \
    --desired-count "$DESIRED_COUNT" \
    --query 'service.[serviceName,desiredCount,runningCount]' \
    --output table

echo ""

# Scale frontend up
echo -e "${BLUE}ℹ Scaling frontend service to ${DESIRED_COUNT}...${NC}"
aws ecs update-service \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --service galaxium-booking-frontend \
    --desired-count "$DESIRED_COUNT" \
    --query 'service.[serviceName,desiredCount,runningCount]' \
    --output table

echo ""
echo -e "${GREEN}✓ Services scaling up${NC}"
echo ""
echo -e "${BLUE}ℹ Services will be available in ~30-60 seconds${NC}"
echo -e "${BLUE}ℹ Check status: aws ecs describe-services --region ${AWS_REGION} --cluster ${CLUSTER_NAME} --services galaxium-booking-backend galaxium-booking-frontend${NC}"

# Made with Bob
