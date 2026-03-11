# ECS Frontend Container Debugging Guide

## Quick Diagnosis Commands

### 1. Check ECS Service Status
```bash
# Get cluster name
aws ecs list-clusters

# List services in cluster
aws ecs list-services --cluster galaxium-travels-cluster

# Describe frontend service
aws ecs describe-services \
  --cluster galaxium-travels-cluster \
  --services galaxium-travels-frontend-service
```

### 2. Check Task Status
```bash
# List tasks
aws ecs list-tasks \
  --cluster galaxium-travels-cluster \
  --service-name galaxium-travels-frontend-service

# Describe tasks (replace TASK_ID with actual task ID from above)
aws ecs describe-tasks \
  --cluster galaxium-travels-cluster \
  --tasks TASK_ID
```

### 3. Check CloudWatch Logs
```bash
# Get recent logs
aws logs tail /ecs/galaxium-travels-frontend --follow

# Get logs from specific time
aws logs tail /ecs/galaxium-travels-frontend \
  --since 30m \
  --format short
```

### 4. Check ECR Repository
```bash
# List images in frontend repository
aws ecr describe-images \
  --repository-name galaxium-travels-frontend

# Check if 'latest' tag exists
aws ecr describe-images \
  --repository-name galaxium-travels-frontend \
  --image-ids imageTag=latest
```

---

## Common Issues and Solutions

### Issue 1: No Docker Image in ECR
**Symptom:** Task fails to start, error about image not found

**Check:**
```bash
aws ecr describe-images --repository-name galaxium-travels-frontend
```

**Solution:** Build and push Docker images
```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Get repository URLs
FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)

# Build and push frontend
cd ../booking_system_frontend
docker build -t $FRONTEND_REPO:latest -f Dockerfile .
docker push $FRONTEND_REPO:latest

# Build and push backend
cd ../booking_system_backend
docker build -t $BACKEND_REPO:latest -f Dockerfile.prod .
docker push $BACKEND_REPO:latest
```

### Issue 2: Task Failing Health Checks
**Symptom:** Tasks start but fail health checks and get replaced

**Check:**
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names galaxium-travels-frontend-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

**Solution:** Check if /health endpoint exists
```bash
# The frontend needs a /health endpoint
# Check if it's configured in nginx.conf
```

### Issue 3: Task Stopped with Error
**Symptom:** Tasks start then immediately stop

**Check:**
```bash
# Get stopped task reason
aws ecs describe-tasks \
  --cluster galaxium-travels-cluster \
  --tasks $(aws ecs list-tasks \
    --cluster galaxium-travels-cluster \
    --service-name galaxium-travels-frontend-service \
    --desired-status STOPPED \
    --query 'taskArns[0]' \
    --output text) \
  --query 'tasks[0].stoppedReason'
```

### Issue 4: IAM Permission Issues
**Symptom:** Cannot pull image from ECR

**Check:**
```bash
# Verify task execution role has ECR permissions
aws iam get-role-policy \
  --role-name galaxium-travels-ecs-task-execution-role \
  --policy-name galaxium-travels-ecs-task-execution-ecr-policy
```

### Issue 5: Environment Variable Issues
**Symptom:** Container starts but application fails

**Check task definition:**
```bash
aws ecs describe-task-definition \
  --task-definition galaxium-travels-frontend \
  --query 'taskDefinition.containerDefinitions[0].environment'
```

---

## Debugging Script

Save this as `debug-ecs.sh`:

```bash
#!/bin/bash

CLUSTER="galaxium-travels-cluster"
SERVICE="galaxium-travels-frontend-service"
REGION="us-east-1"

echo "=== ECS Service Status ==="
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
  --output table

echo -e "\n=== Recent Events ==="
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $REGION \
  --query 'services[0].events[:5]' \
  --output table

echo -e "\n=== Task Status ==="
TASK_ARN=$(aws ecs list-tasks \
  --cluster $CLUSTER \
  --service-name $SERVICE \
  --region $REGION \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
  aws ecs describe-tasks \
    --cluster $CLUSTER \
    --tasks $TASK_ARN \
    --region $REGION \
    --query 'tasks[0].{LastStatus:lastStatus,HealthStatus:healthStatus,StoppedReason:stoppedReason}' \
    --output table
  
  echo -e "\n=== Container Status ==="
  aws ecs describe-tasks \
    --cluster $CLUSTER \
    --tasks $TASK_ARN \
    --region $REGION \
    --query 'tasks[0].containers[0]' \
    --output table
else
  echo "No tasks found"
fi

echo -e "\n=== ECR Images ==="
aws ecr describe-images \
  --repository-name galaxium-travels-frontend \
  --region $REGION \
  --query 'imageDetails[*].{Tags:imageTags,Pushed:imagePushedAt,Size:imageSizeInBytes}' \
  --output table

echo -e "\n=== Target Group Health ==="
TG_ARN=$(aws elbv2 describe-target-groups \
  --names galaxium-travels-frontend-tg \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $REGION \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table

echo -e "\n=== Recent CloudWatch Logs ==="
aws logs tail /ecs/galaxium-travels-frontend \
  --since 10m \
  --format short \
  --region $REGION | head -50
```

Make it executable:
```bash
chmod +x debug-ecs.sh
./debug-ecs.sh
```

---

## Step-by-Step Debugging Process

### Step 1: Verify Images Exist
```bash
# Check if images are in ECR
aws ecr describe-images --repository-name galaxium-travels-frontend
aws ecr describe-images --repository-name galaxium-travels-backend
```

**If no images:** You need to build and push them first (see Issue 1 solution above)

### Step 2: Check Service Events
```bash
aws ecs describe-services \
  --cluster galaxium-travels-cluster \
  --services galaxium-travels-frontend-service \
  --query 'services[0].events[:10]' \
  --output table
```

Look for error messages in the events.

### Step 3: Check Task Logs
```bash
# Get the most recent logs
aws logs tail /ecs/galaxium-travels-frontend --follow
```

Look for:
- Application startup errors
- Port binding issues
- Missing environment variables
- Permission errors

### Step 4: Check Task Definition
```bash
aws ecs describe-task-definition \
  --task-definition galaxium-travels-frontend \
  --query 'taskDefinition.containerDefinitions[0]'
```

Verify:
- Image URI is correct
- Port mappings are correct (80)
- Environment variables are set
- Health check is configured

### Step 5: Check Network Connectivity
```bash
# Verify security groups allow traffic
aws ec2 describe-security-groups \
  --group-ids $(aws ecs describe-services \
    --cluster galaxium-travels-cluster \
    --services galaxium-travels-frontend-service \
    --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' \
    --output text)
```

---

## Frontend-Specific Issues

### Missing /health Endpoint

The frontend container needs a `/health` endpoint for ALB health checks.

**Check nginx.conf:**
```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

**If missing, add it to `booking_system_frontend/nginx.conf`**

### VITE_API_URL Environment Variable

The frontend needs to know the backend URL.

**Check in task definition:**
```bash
aws ecs describe-task-definition \
  --task-definition galaxium-travels-frontend \
  --query 'taskDefinition.containerDefinitions[0].environment'
```

Should show:
```json
[
  {
    "name": "VITE_API_URL",
    "value": "http://ALB_DNS_NAME/api"
  }
]
```

---

## Quick Fix Commands

### Force New Deployment
```bash
# Force ECS to pull new images and restart
aws ecs update-service \
  --cluster galaxium-travels-cluster \
  --service galaxium-travels-frontend-service \
  --force-new-deployment
```

### Scale Down and Up
```bash
# Scale to 0
aws ecs update-service \
  --cluster galaxium-travels-cluster \
  --service galaxium-travels-frontend-service \
  --desired-count 0

# Wait a moment, then scale back up
aws ecs update-service \
  --cluster galaxium-travels-cluster \
  --service galaxium-travels-frontend-service \
  --desired-count 2
```

### Check ALB
```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test ALB directly
curl -v http://$(terraform output -raw alb_dns_name)
```

---

## Most Likely Issue

Based on the Terraform configuration, the **most likely issue** is:

**No Docker images have been pushed to ECR yet!**

The ECS service is trying to pull images with the `latest` tag, but they don't exist in ECR.

### Solution:
```bash
# 1. Get ECR repository URLs
cd terraform
FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)

# 2. Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $(echo $FRONTEND_REPO | cut -d'/' -f1)

# 3. Build and push frontend
cd ../booking_system_frontend
docker build -t $FRONTEND_REPO:latest -f Dockerfile .
docker push $FRONTEND_REPO:latest

# 4. Build and push backend
cd ../booking_system_backend
docker build -t $BACKEND_REPO:latest -f Dockerfile.prod .
docker push $BACKEND_REPO:latest

# 5. Force new deployment
aws ecs update-service \
  --cluster galaxium-travels-cluster \
  --service galaxium-travels-frontend-service \
  --force-new-deployment

aws ecs update-service \
  --cluster galaxium-travels-cluster \
  --service galaxium-travels-backend-service \
  --force-new-deployment
```

---

## Contact Points for Help

If you're still stuck, provide:
1. Output of `./debug-ecs.sh`
2. Recent CloudWatch logs
3. Service events from ECS console
4. Whether images exist in ECR

This will help diagnose the exact issue.