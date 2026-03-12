#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "=========================================="
echo "Galaxium Booking System - AWS Deployment"
echo "=========================================="
echo ""

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_BASE

# Build and push backend
echo ""
echo "🏗️  Building backend image (AMD64)..."
cd booking_system_backend
docker build --platform linux/amd64 -f Dockerfile.prod -t booking-backend:latest .

echo "📤 Pushing backend image to ECR..."
docker tag booking-backend:latest $ECR_BASE/galaxium-booking-backend:latest
docker push $ECR_BASE/galaxium-booking-backend:latest

# Get backend image digest and create new task definition
echo "📝 Creating new backend task definition..."
BACKEND_DIGEST=$(aws ecr describe-images --repository-name galaxium-booking-backend --region $REGION --output json | jq -r '.imageDetails | sort_by(.imagePushedAt) | reverse | .[0] | .imageDigest')
aws ecs describe-task-definition --task-definition galaxium-booking-backend --region $REGION | \
  jq ".taskDefinition | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) | .containerDefinitions[0].image = \"$ECR_BASE/galaxium-booking-backend@$BACKEND_DIGEST\"" > /tmp/backend-task-def.json
BACKEND_REVISION=$(aws ecs register-task-definition --cli-input-json file:///tmp/backend-task-def.json --region $REGION --query 'taskDefinition.revision' --output text)

# Build and push frontend
echo ""
echo "🏗️  Building frontend image (AMD64)..."
cd ../booking_system_frontend
docker build --platform linux/amd64 -f Dockerfile.prod -t booking-frontend:latest .

echo "📤 Pushing frontend image to ECR..."
docker tag booking-frontend:latest $ECR_BASE/galaxium-booking-frontend:latest
docker push $ECR_BASE/galaxium-booking-frontend:latest

# Get frontend image digest and create new task definition
echo "📝 Creating new frontend task definition..."
FRONTEND_DIGEST=$(aws ecr describe-images --repository-name galaxium-booking-frontend --region $REGION --output json | jq -r '.imageDetails | sort_by(.imagePushedAt) | reverse | .[0] | .imageDigest')
aws ecs describe-task-definition --task-definition galaxium-booking-frontend --region $REGION | \
  jq ".taskDefinition | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) | .containerDefinitions[0].image = \"$ECR_BASE/galaxium-booking-frontend@$FRONTEND_DIGEST\"" > /tmp/frontend-task-def.json
FRONTEND_REVISION=$(aws ecs register-task-definition --cli-input-json file:///tmp/frontend-task-def.json --region $REGION --query 'taskDefinition.revision' --output text)

# Update ECS services
echo ""
echo "🚀 Updating ECS services..."
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-backend \
  --task-definition galaxium-booking-backend:$BACKEND_REVISION \
  --force-new-deployment \
  --region $REGION > /dev/null

aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-frontend \
  --task-definition galaxium-booking-frontend:$FRONTEND_REVISION \
  --force-new-deployment \
  --region $REGION > /dev/null

echo ""
echo "✅ Deployment initiated successfully!"
echo ""
echo "Backend task definition: galaxium-booking-backend:$BACKEND_REVISION"
echo "Frontend task definition: galaxium-booking-frontend:$FRONTEND_REVISION"
echo ""
echo "Monitor deployment status:"
echo "  aws ecs describe-services --cluster galaxium-booking-cluster --services galaxium-booking-backend galaxium-booking-frontend --region $REGION"
echo ""
echo "Application URL:"
cd ../terraform
terraform output alb_dns_name

# Made with Bob
