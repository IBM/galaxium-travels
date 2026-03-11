# Phase 3: CI/CD Pipeline

## Overview
Set up continuous integration and deployment pipeline to build, test, and deploy Docker images to AWS ECS.

**Duration:** 1-2 days  
**Prerequisites:** [Phase 2: Infrastructure as Code](./phase-2-infrastructure-as-code.md) complete  
**Next Phase:** [Phase 4: Deployment Steps](./phase-4-deployment-steps.md)

---

## Objectives

- [ ] Configure AWS CLI and credentials
- [ ] Build and tag Docker images
- [ ] Push images to ECR
- [ ] Create deployment scripts
- [ ] Set up automated CI/CD (optional)
- [ ] Test deployment process

---

## 1. AWS CLI Setup

### 1.1 Install AWS CLI

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download and run: https://awscli.amazonaws.com/AWSCLIV2.msi
```

### 1.2 Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)

# Verify configuration
aws sts get-caller-identity
```

---

## 2. ECR Authentication and Image Management

### 2.1 ECR Login Script

**File:** `scripts/ecr-login.sh`

```bash
#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "✓ Successfully logged into ECR"
```

### 2.2 Build and Push Script

**File:** `scripts/build-and-push.sh`

```bash
#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_NAME="galaxium-travels"
IMAGE_TAG=${IMAGE_TAG:-latest}

# ECR URLs
ECR_FRONTEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-frontend"
ECR_BACKEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-backend"

echo "=========================================="
echo "Building and Pushing Docker Images"
echo "=========================================="
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
echo "Tag: $IMAGE_TAG"
echo "=========================================="

# Login to ECR
echo "→ Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Backend
echo ""
echo "→ Building backend image..."
docker build -t ${PROJECT_NAME}-backend:${IMAGE_TAG} \
    -f booking_system_backend/Dockerfile.prod \
    booking_system_backend/

echo "→ Tagging backend image..."
docker tag ${PROJECT_NAME}-backend:${IMAGE_TAG} ${ECR_BACKEND}:${IMAGE_TAG}
docker tag ${PROJECT_NAME}-backend:${IMAGE_TAG} ${ECR_BACKEND}:latest

echo "→ Pushing backend image..."
docker push ${ECR_BACKEND}:${IMAGE_TAG}
docker push ${ECR_BACKEND}:latest

# Build Frontend
echo ""
echo "→ Building frontend image..."
docker build -t ${PROJECT_NAME}-frontend:${IMAGE_TAG} \
    -f booking_system_frontend/Dockerfile \
    booking_system_frontend/

echo "→ Tagging frontend image..."
docker tag ${PROJECT_NAME}-frontend:${IMAGE_TAG} ${ECR_FRONTEND}:${IMAGE_TAG}
docker tag ${PROJECT_NAME}-frontend:${IMAGE_TAG} ${ECR_FRONTEND}:latest

echo "→ Pushing frontend image..."
docker push ${ECR_FRONTEND}:${IMAGE_TAG}
docker push ${ECR_FRONTEND}:latest

echo ""
echo "=========================================="
echo "✓ Images successfully pushed to ECR"
echo "=========================================="
echo "Backend: ${ECR_BACKEND}:${IMAGE_TAG}"
echo "Frontend: ${ECR_FRONTEND}:${IMAGE_TAG}"
echo "=========================================="
```

### 2.3 Make Scripts Executable

```bash
chmod +x scripts/ecr-login.sh
chmod +x scripts/build-and-push.sh
```

---

## 3. ECS Deployment

### 3.1 ECS Task Definitions

**File:** `terraform/ecs.tf` (add to Phase 2 Terraform)

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-frontend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-frontend-logs"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-backend-logs"
  }
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name  = "frontend"
    image = "${aws_ecr_repository.frontend.repository_url}:${var.frontend_image_tag}"

    portMappings = [{
      containerPort = 80
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "VITE_API_URL"
        value = "http://${aws_lb.main.dns_name}"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:80/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = {
    Name = "${var.project_name}-frontend-task"
  }
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
      },
      {
        name  = "CORS_ORIGINS"
        value = "http://${aws_lb.main.dns_name}"
      },
      {
        name  = "ENVIRONMENT"
        value = var.environment
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = {
    Name = "${var.project_name}-backend-task"
  }
}

# Frontend ECS Service
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.project_name}-frontend-service"
  }
}

# Backend ECS Service
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http, aws_db_instance.main]

  tags = {
    Name = "${var.project_name}-backend-service"
  }
}
```

### 3.2 IAM Roles for ECS

**File:** `terraform/iam.tf`

```hcl
# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-ecs-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-role"
  }
}

# Additional policies for task role (if needed)
resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.project_name}-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### 3.3 Deploy ECS Services Script

**File:** `scripts/deploy-ecs.sh`

```bash
#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="galaxium-travels"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

echo "=========================================="
echo "Deploying to ECS"
echo "=========================================="

# Force new deployment for frontend
echo "→ Updating frontend service..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service ${PROJECT_NAME}-frontend \
    --force-new-deployment \
    --region $AWS_REGION

# Force new deployment for backend
echo "→ Updating backend service..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service ${PROJECT_NAME}-backend \
    --force-new-deployment \
    --region $AWS_REGION

echo ""
echo "=========================================="
echo "✓ Deployment initiated"
echo "=========================================="
echo "Monitor deployment status:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services ${PROJECT_NAME}-frontend ${PROJECT_NAME}-backend --region $AWS_REGION"
echo "=========================================="
```

---

## 4. Complete Deployment Pipeline

### 4.1 Full Deployment Script

**File:** `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

# Configuration
export AWS_REGION=${AWS_REGION:-us-east-1}
export IMAGE_TAG=${IMAGE_TAG:-$(git rev-parse --short HEAD)}

echo "=========================================="
echo "Galaxium Travels - Full Deployment"
echo "=========================================="
echo "Region: $AWS_REGION"
echo "Image Tag: $IMAGE_TAG"
echo "=========================================="

# Step 1: Build and push images
echo ""
echo "STEP 1: Building and pushing Docker images..."
./scripts/build-and-push.sh

# Step 2: Deploy to ECS
echo ""
echo "STEP 2: Deploying to ECS..."
./scripts/deploy-ecs.sh

# Step 3: Wait for deployment
echo ""
echo "STEP 3: Waiting for deployment to complete..."
sleep 10

PROJECT_NAME="galaxium-travels"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

# Check frontend service
echo "→ Checking frontend service..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services ${PROJECT_NAME}-frontend \
    --region $AWS_REGION

# Check backend service
echo "→ Checking backend service..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services ${PROJECT_NAME}-backend \
    --region $AWS_REGION

echo ""
echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="

# Get ALB URL
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --region $AWS_REGION \
    --query "LoadBalancers[?contains(LoadBalancerName, '${PROJECT_NAME}')].DNSName" \
    --output text)

echo "Application URL: http://${ALB_DNS}"
echo "=========================================="
```

### 4.2 Make Deployment Script Executable

```bash
chmod +x scripts/deploy.sh
chmod +x scripts/deploy-ecs.sh
```

---

## 5. GitHub Actions CI/CD (Optional)

### 5.1 GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  PROJECT_NAME: galaxium-travels

jobs:
  deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$PROJECT_NAME-backend:$IMAGE_TAG \
            -f booking_system_backend/Dockerfile.prod \
            booking_system_backend/
          docker push $ECR_REGISTRY/$PROJECT_NAME-backend:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$PROJECT_NAME-backend:$IMAGE_TAG \
            $ECR_REGISTRY/$PROJECT_NAME-backend:latest
          docker push $ECR_REGISTRY/$PROJECT_NAME-backend:latest

      - name: Build, tag, and push frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG \
            -f booking_system_frontend/Dockerfile \
            booking_system_frontend/
          docker push $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG \
            $ECR_REGISTRY/$PROJECT_NAME-frontend:latest
          docker push $ECR_REGISTRY/$PROJECT_NAME-frontend:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster $PROJECT_NAME-cluster \
            --service $PROJECT_NAME-frontend \
            --force-new-deployment \
            --region $AWS_REGION
          
          aws ecs update-service \
            --cluster $PROJECT_NAME-cluster \
            --service $PROJECT_NAME-backend \
            --force-new-deployment \
            --region $AWS_REGION

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster $PROJECT_NAME-cluster \
            --services $PROJECT_NAME-frontend $PROJECT_NAME-backend \
            --region $AWS_REGION
```

### 5.2 Required GitHub Secrets

Add these secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## 6. Rollback Procedure

### 6.1 Rollback Script

**File:** `scripts/rollback.sh`

```bash
#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="galaxium-travels"
CLUSTER_NAME="${PROJECT_NAME}-cluster"

if [ -z "$1" ]; then
    echo "Usage: ./rollback.sh <task-definition-revision>"
    echo "Example: ./rollback.sh 5"
    exit 1
fi

REVISION=$1

echo "=========================================="
echo "Rolling back to revision $REVISION"
echo "=========================================="

# Rollback frontend
echo "→ Rolling back frontend..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service ${PROJECT_NAME}-frontend \
    --task-definition ${PROJECT_NAME}-frontend:$REVISION \
    --region $AWS_REGION

# Rollback backend
echo "→ Rolling back backend..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service ${PROJECT_NAME}-backend \
    --task-definition ${PROJECT_NAME}-backend:$REVISION \
    --region $AWS_REGION

echo ""
echo "✓ Rollback initiated to revision $REVISION"
```

---

## 7. Monitoring Deployment

### 7.1 Check Service Status

```bash
# View service status
aws ecs describe-services \
    --cluster galaxium-travels-cluster \
    --services galaxium-travels-frontend galaxium-travels-backend \
    --region us-east-1

# View running tasks
aws ecs list-tasks \
    --cluster galaxium-travels-cluster \
    --region us-east-1

# View logs
aws logs tail /ecs/galaxium-travels-frontend --follow
aws logs tail /ecs/galaxium-travels-backend --follow
```

---

## 8. Verification Checklist

- [ ] ECR repositories created and accessible
- [ ] Docker images build successfully
- [ ] Images pushed to ECR
- [ ] ECS services deployed
- [ ] Health checks passing
- [ ] Application accessible via ALB
- [ ] Logs visible in CloudWatch
- [ ] Deployment script works end-to-end
- [ ] Rollback procedure tested

---

## Next Steps

Once Phase 3 is complete:
1. Document the deployment process
2. Train team on deployment procedures
3. Proceed to [Phase 4: Deployment Steps](./phase-4-deployment-steps.md)

---

**Estimated Time:** 1-2 days  
**Difficulty:** Medium  
**Dependencies:** Phase 2 complete