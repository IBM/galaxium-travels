# Phase 3: Deploy Containers to AWS

## Goal
Build Docker images, push them to ECR, and deploy to ECS.

## Duration
1 day

## Prerequisites
- Phase 1 completed (Docker images ready)
- Phase 2 completed (AWS infrastructure deployed)
- AWS CLI configured
- Docker running locally

## Tasks

### 1. Get ECR Repository URLs

```bash
cd terraform
terraform output ecr_frontend_url
terraform output ecr_backend_url
```

Save these URLs - you'll need them for the next steps.

### 2. Authenticate Docker to ECR

```bash
# Get your AWS account ID
aws sts get-caller-identity --query Account --output text

# Login to ECR (replace ACCOUNT_ID and REGION)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### 3. Build and Push Backend Image

```bash
cd booking_system_backend

# Build the image
docker build -f Dockerfile.prod -t booking-backend:latest .

# Tag for ECR (use your ECR URL from terraform output)
docker tag booking-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/galaxium-booking-backend:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/galaxium-booking-backend:latest
```

### 4. Build and Push Frontend Image

```bash
cd ../booking_system_frontend

# Build the image
docker build -f Dockerfile.prod -t booking-frontend:latest .

# Tag for ECR (use your ECR URL from terraform output)
docker tag booking-frontend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/galaxium-booking-frontend:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/galaxium-booking-frontend:latest
```

### 5. Update ECS Services

The ECS services will automatically pull the new images. Force a new deployment:

```bash
# Update backend service
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-backend \
  --force-new-deployment \
  --region us-east-1

# Update frontend service
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-frontend \
  --force-new-deployment \
  --region us-east-1
```

### 6. Monitor Deployment

Check the ECS console or use CLI:

```bash
# Check backend service status
aws ecs describe-services \
  --cluster galaxium-booking-cluster \
  --services galaxium-booking-backend \
  --region us-east-1 \
  --query 'services[0].deployments'

# Check frontend service status
aws ecs describe-services \
  --cluster galaxium-booking-cluster \
  --services galaxium-booking-frontend \
  --region us-east-1 \
  --query 'services[0].deployments'
```

Wait for `runningCount` to match `desiredCount` for both services.

### 7. Get Application URL

```bash
cd terraform
terraform output alb_dns_name
```

Access this URL in your browser. You should see the application!

## Validation Checklist

- [ ] Docker authenticated to ECR
- [ ] Backend image built successfully
- [ ] Backend image pushed to ECR
- [ ] Frontend image built successfully
- [ ] Frontend image pushed to ECR
- [ ] Both ECS services updated
- [ ] Backend tasks running (check ECS console)
- [ ] Frontend tasks running (check ECS console)
- [ ] ALB health checks passing
- [ ] Application accessible via ALB DNS
- [ ] Frontend loads in browser
- [ ] Can see flights list (even if empty)

## Troubleshooting

### Images not building
```bash
# Check Docker is running
docker ps

# Check Dockerfile syntax
docker build -f Dockerfile.prod --no-cache .
```

### Push to ECR fails
```bash
# Re-authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Verify repository exists
aws ecr describe-repositories --region us-east-1
```

### ECS tasks not starting
```bash
# Check task logs
aws logs tail /ecs/galaxium-booking-backend --follow --region us-east-1
aws logs tail /ecs/galaxium-booking-frontend --follow --region us-east-1

# Common issues:
# - Image not found: Verify ECR URL in task definition
# - Container crashes: Check application logs
# - Health check fails: Verify health check path
```

### Application not accessible
```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw backend_target_group_arn) \
  --region us-east-1

# Check security groups allow traffic
# - ALB SG: Allow 80 from 0.0.0.0/0
# - ECS SG: Allow all from ALB SG
```

### Database connection fails
This is expected at this stage - we'll migrate the database in Phase 4.
The backend will show errors about database connection, which is normal.

## Quick Deployment Script

Create `deploy.sh` in project root:

```bash
#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_BASE

echo "Building and pushing backend..."
cd booking_system_backend
docker build -f Dockerfile.prod -t booking-backend:latest .
docker tag booking-backend:latest $ECR_BASE/galaxium-booking-backend:latest
docker push $ECR_BASE/galaxium-booking-backend:latest

echo "Building and pushing frontend..."
cd ../booking_system_frontend
docker build -f Dockerfile.prod -t booking-frontend:latest .
docker tag booking-frontend:latest $ECR_BASE/galaxium-booking-frontend:latest
docker push $ECR_BASE/galaxium-booking-frontend:latest

echo "Updating ECS services..."
aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-backend \
  --force-new-deployment \
  --region $REGION

aws ecs update-service \
  --cluster galaxium-booking-cluster \
  --service galaxium-booking-frontend \
  --force-new-deployment \
  --region $REGION

echo "Deployment initiated! Check ECS console for status."
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Expected State

At the end of this phase:
- ✅ Docker images in ECR
- ✅ ECS tasks running
- ✅ Application accessible via ALB
- ✅ Frontend loads
- ⚠️ Backend shows database errors (expected - will fix in Phase 4)

## Next Phase

Once containers are deployed and accessible, proceed to **Phase 4: Database Migration and Testing**.