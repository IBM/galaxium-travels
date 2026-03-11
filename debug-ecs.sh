#!/bin/bash

# ECS Frontend Debugging Script
# This script checks the status of your ECS frontend service and helps diagnose issues

set -e

CLUSTER="galaxium-travels-cluster"
SERVICE="galaxium-travels-frontend-service"
REGION="us-east-1"

echo "=========================================="
echo "ECS Frontend Service Debugging"
echo "=========================================="
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured or credentials invalid"
    echo "Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# 1. Check ECR Images
echo "=== 1. Checking ECR Images ==="
echo ""
if aws ecr describe-images --repository-name galaxium-travels-frontend --region $REGION &> /dev/null; then
    IMAGE_COUNT=$(aws ecr describe-images \
        --repository-name galaxium-travels-frontend \
        --region $REGION \
        --query 'length(imageDetails)' \
        --output text)
    
    if [ "$IMAGE_COUNT" -eq "0" ]; then
        echo "❌ NO IMAGES FOUND IN ECR!"
        echo ""
        echo "This is likely the problem. You need to build and push Docker images."
        echo ""
        echo "Run these commands:"
        echo ""
        echo "  cd terraform"
        echo "  FRONTEND_REPO=\$(terraform output -raw ecr_frontend_repository_url)"
        echo "  BACKEND_REPO=\$(terraform output -raw ecr_backend_repository_url)"
        echo ""
        echo "  # Login to ECR"
        echo "  aws ecr get-login-password --region us-east-1 | \\"
        echo "    docker login --username AWS --password-stdin \$(echo \$FRONTEND_REPO | cut -d'/' -f1)"
        echo ""
        echo "  # Build and push frontend"
        echo "  cd ../booking_system_frontend"
        echo "  docker build -t \$FRONTEND_REPO:latest -f Dockerfile ."
        echo "  docker push \$FRONTEND_REPO:latest"
        echo ""
        echo "  # Build and push backend"
        echo "  cd ../booking_system_backend"
        echo "  docker build -t \$BACKEND_REPO:latest -f Dockerfile.prod ."
        echo "  docker push \$BACKEND_REPO:latest"
        echo ""
        exit 1
    else
        echo "✅ Found $IMAGE_COUNT image(s) in ECR"
        aws ecr describe-images \
            --repository-name galaxium-travels-frontend \
            --region $REGION \
            --query 'imageDetails[*].{Tags:imageTags[0],Pushed:imagePushedAt,Size:imageSizeInBytes}' \
            --output table
    fi
else
    echo "❌ Cannot access ECR repository"
fi
echo ""

# 2. Check ECS Service Status
echo "=== 2. ECS Service Status ==="
echo ""
SERVICE_STATUS=$(aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
    --output json)

echo "$SERVICE_STATUS" | jq -r 'to_entries | .[] | "\(.key): \(.value)"'
echo ""

RUNNING=$(echo "$SERVICE_STATUS" | jq -r '.Running')
DESIRED=$(echo "$SERVICE_STATUS" | jq -r '.Desired')

if [ "$RUNNING" -eq "$DESIRED" ]; then
    echo "✅ Service is running ($RUNNING/$DESIRED tasks)"
else
    echo "⚠️  Service not fully running ($RUNNING/$DESIRED tasks)"
fi
echo ""

# 3. Check Recent Service Events
echo "=== 3. Recent Service Events ==="
echo ""
aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query 'services[0].events[:5].[createdAt,message]' \
    --output text | while IFS=$'\t' read -r timestamp message; do
        echo "[$timestamp] $message"
    done
echo ""

# 4. Check Task Status
echo "=== 4. Task Status ==="
echo ""
TASK_ARN=$(aws ecs list-tasks \
    --cluster $CLUSTER \
    --service-name $SERVICE \
    --region $REGION \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
    echo "Task ARN: $TASK_ARN"
    echo ""
    
    TASK_INFO=$(aws ecs describe-tasks \
        --cluster $CLUSTER \
        --tasks $TASK_ARN \
        --region $REGION \
        --query 'tasks[0]' \
        --output json)
    
    echo "Last Status: $(echo "$TASK_INFO" | jq -r '.lastStatus')"
    echo "Health Status: $(echo "$TASK_INFO" | jq -r '.healthStatus // "N/A"')"
    echo "Desired Status: $(echo "$TASK_INFO" | jq -r '.desiredStatus')"
    
    STOPPED_REASON=$(echo "$TASK_INFO" | jq -r '.stoppedReason // "N/A"')
    if [ "$STOPPED_REASON" != "N/A" ]; then
        echo "⚠️  Stopped Reason: $STOPPED_REASON"
    fi
    
    echo ""
    echo "Container Status:"
    echo "$TASK_INFO" | jq -r '.containers[0] | "  Name: \(.name)\n  Status: \(.lastStatus)\n  Exit Code: \(.exitCode // "N/A")\n  Reason: \(.reason // "N/A")"'
else
    echo "❌ No tasks found"
fi
echo ""

# 5. Check Target Group Health
echo "=== 5. Target Group Health ==="
echo ""
TG_ARN=$(aws elbv2 describe-target-groups \
    --names galaxium-travels-frontend-tg \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null)

if [ -n "$TG_ARN" ]; then
    aws elbv2 describe-target-health \
        --target-group-arn $TG_ARN \
        --region $REGION \
        --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' \
        --output table
else
    echo "Cannot find target group"
fi
echo ""

# 6. Check CloudWatch Logs
echo "=== 6. Recent CloudWatch Logs (last 10 minutes) ==="
echo ""
if aws logs describe-log-streams \
    --log-group-name /ecs/galaxium-travels-frontend \
    --region $REGION \
    --max-items 1 &> /dev/null; then
    
    echo "Fetching logs..."
    aws logs tail /ecs/galaxium-travels-frontend \
        --since 10m \
        --format short \
        --region $REGION 2>/dev/null | head -30 || echo "No recent logs found"
else
    echo "No logs available yet"
fi
echo ""

# 7. Summary and Recommendations
echo "=========================================="
echo "Summary and Recommendations"
echo "=========================================="
echo ""

if [ "$IMAGE_COUNT" -eq "0" ]; then
    echo "🔴 CRITICAL: No Docker images in ECR"
    echo "   → Build and push images first (see commands above)"
elif [ "$RUNNING" -eq "0" ]; then
    echo "🔴 CRITICAL: No tasks running"
    echo "   → Check service events and CloudWatch logs above"
    echo "   → Run: aws logs tail /ecs/galaxium-travels-frontend --follow"
elif [ "$RUNNING" -lt "$DESIRED" ]; then
    echo "🟡 WARNING: Not all tasks running ($RUNNING/$DESIRED)"
    echo "   → Check service events and task status above"
    echo "   → Tasks may be failing health checks"
else
    echo "🟢 Service appears healthy"
    echo "   → Check ALB URL: terraform output alb_url"
fi

echo ""
echo "For more detailed debugging, see: bob_artifacts/ecs-debugging-guide.md"

# Made with Bob
