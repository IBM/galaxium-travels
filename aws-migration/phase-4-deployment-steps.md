# Phase 4: Deployment Steps

## Overview
Execute the complete deployment of Galaxium Travels to AWS infrastructure following a step-by-step process.

**Duration:** 1 day  
**Prerequisites:** Phases 1-3 complete  
**Next Phase:** [Phase 5: Post-Deployment](./phase-5-post-deployment.md)

---

## Pre-Deployment Checklist

- [ ] AWS account configured with appropriate permissions
- [ ] AWS CLI installed and configured
- [ ] Terraform installed (v1.0+)
- [ ] Docker installed and running
- [ ] All code changes from Phase 1 committed
- [ ] Database credentials prepared
- [ ] Domain name ready (if using custom domain)
- [ ] SSL certificate created in ACM (if using HTTPS)

---

## Step 1: Prepare Terraform Variables

### 1.1 Create terraform.tfvars

**File:** `terraform/terraform.tfvars`

```hcl
# AWS Configuration
aws_region  = "us-east-1"
environment = "prod"

# Project Configuration
project_name = "galaxium-travels"
vpc_cidr     = "10.0.0.0/16"

# Database Configuration
db_username = "galaxium_admin"
db_password = "CHANGE_ME_SECURE_PASSWORD_HERE"  # Use strong password
db_name     = "galaxium_db"

# Container Image Tags
frontend_image_tag = "latest"
backend_image_tag  = "latest"

# Optional: Domain and SSL
# domain_name     = "galaxium-travels.com"
# certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abc-123"
```

**Security Note:** Never commit `terraform.tfvars` to version control. Add to `.gitignore`.

### 1.2 Verify Configuration

```bash
cd terraform

# Validate variables
terraform validate

# Check what will be created
terraform plan
```

---

## Step 2: Deploy Infrastructure

### 2.1 Initialize Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Expected output: Terraform has been successfully initialized!
```

### 2.2 Review Infrastructure Plan

```bash
# Create execution plan
terraform plan -out=tfplan

# Review the plan carefully
# Expected resources: ~50-60 resources to be created
```

### 2.3 Apply Infrastructure

```bash
# Apply the plan
terraform apply tfplan

# This will take 10-15 minutes
# Resources created:
# - VPC and networking (subnets, route tables, NAT gateways)
# - Security groups
# - Application Load Balancer
# - ECS cluster
# - RDS database
# - ECR repositories
# - IAM roles
# - CloudWatch log groups
```

### 2.4 Save Outputs

```bash
# Save important outputs
terraform output > ../deployment-outputs.txt

# View outputs
terraform output

# Key outputs:
# - alb_dns_name: Load balancer URL
# - ecr_frontend_repository_url: Frontend ECR URL
# - ecr_backend_repository_url: Backend ECR URL
# - rds_endpoint: Database endpoint
```

---

## Step 3: Initialize Database

### 3.1 Connect to RDS

```bash
# Get RDS endpoint from Terraform output
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

# Install PostgreSQL client (if not installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client

# Connect to database
psql -h $RDS_ENDPOINT -U galaxium_admin -d galaxium_db

# Enter password when prompted
```

### 3.2 Run Database Migrations

```bash
# From project root
cd booking_system_backend

# Set database URL
export DATABASE_URL="postgresql://galaxium_admin:PASSWORD@$RDS_ENDPOINT/galaxium_db"

# Run migrations (create tables)
python -c "from db import init_db; init_db()"

# Seed initial data
python seed.py
```

---

## Step 4: Build and Push Docker Images

### 4.1 Authenticate with ECR

```bash
# From project root
cd ..

# Make scripts executable
chmod +x scripts/*.sh

# Login to ECR
./scripts/ecr-login.sh
```

### 4.2 Build and Push Images

```bash
# Build and push both images
./scripts/build-and-push.sh

# This will:
# 1. Build backend Docker image
# 2. Tag and push to ECR
# 3. Build frontend Docker image
# 4. Tag and push to ECR

# Expected time: 5-10 minutes
```

### 4.3 Verify Images in ECR

```bash
# List backend images
aws ecr describe-images \
    --repository-name galaxium-travels-backend \
    --region us-east-1

# List frontend images
aws ecr describe-images \
    --repository-name galaxium-travels-frontend \
    --region us-east-1
```

---

## Step 5: Deploy ECS Services

### 5.1 Update Terraform with ECS Services

The ECS services should already be defined in `terraform/ecs.tf` from Phase 3. If not, add them now.

### 5.2 Apply ECS Configuration

```bash
cd terraform

# Plan ECS deployment
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# This creates:
# - ECS task definitions
# - ECS services (frontend and backend)
# - Auto-scaling configurations
```

### 5.3 Monitor Deployment

```bash
# Watch service deployment
aws ecs describe-services \
    --cluster galaxium-travels-cluster \
    --services galaxium-travels-frontend galaxium-travels-backend \
    --region us-east-1

# Check running tasks
aws ecs list-tasks \
    --cluster galaxium-travels-cluster \
    --region us-east-1

# View task details
TASK_ARN=$(aws ecs list-tasks \
    --cluster galaxium-travels-cluster \
    --service-name galaxium-travels-backend \
    --region us-east-1 \
    --query 'taskArns[0]' \
    --output text)

aws ecs describe-tasks \
    --cluster galaxium-travels-cluster \
    --tasks $TASK_ARN \
    --region us-east-1
```

---

## Step 6: Verify Deployment

### 6.1 Get Application URL

```bash
# Get ALB DNS name
ALB_DNS=$(cd terraform && terraform output -raw alb_dns_name)

echo "Application URL: http://$ALB_DNS"
```

### 6.2 Test Health Endpoints

```bash
# Test backend health
curl http://$ALB_DNS/health

# Expected: {"status":"healthy","service":"galaxium-booking-backend",...}

# Test database health
curl http://$ALB_DNS/health/db

# Expected: {"status":"healthy","database":"connected",...}

# Test frontend health
curl http://$ALB_DNS/health

# Expected: healthy
```

### 6.3 Test Application Functionality

```bash
# List flights
curl http://$ALB_DNS/api/flights

# Expected: JSON array of flights

# Open in browser
open http://$ALB_DNS  # macOS
# or
xdg-open http://$ALB_DNS  # Linux
```

### 6.4 Verify in Browser

1. Navigate to `http://<ALB_DNS>`
2. Check that frontend loads
3. Navigate to Flights page
4. Verify flights are displayed
5. Test booking functionality
6. Check My Bookings page

---

## Step 7: Configure DNS (Optional)

### 7.1 Create DNS Record

If using a custom domain:

```bash
# In your DNS provider (Route 53, Cloudflare, etc.)
# Create a CNAME record:
# Name: www.galaxium-travels.com
# Type: CNAME
# Value: <ALB_DNS_NAME>
# TTL: 300
```

### 7.2 Update CORS Configuration

Update backend environment variables to include your domain:

```bash
# Update ECS task definition with new CORS_ORIGINS
# Include your custom domain in the CORS_ORIGINS environment variable
```

---

## Step 8: Enable HTTPS (Optional)

### 8.1 Request SSL Certificate

```bash
# Request certificate in ACM
aws acm request-certificate \
    --domain-name galaxium-travels.com \
    --subject-alternative-names www.galaxium-travels.com \
    --validation-method DNS \
    --region us-east-1

# Note the certificate ARN
```

### 8.2 Validate Certificate

Follow the DNS validation instructions in ACM console.

### 8.3 Update Terraform

```hcl
# In terraform.tfvars
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abc-123"
```

```bash
# Apply changes
cd terraform
terraform plan -out=tfplan
terraform apply tfplan
```

---

## Step 9: View Logs

### 9.1 CloudWatch Logs

```bash
# View backend logs
aws logs tail /ecs/galaxium-travels-backend --follow

# View frontend logs
aws logs tail /ecs/galaxium-travels-frontend --follow

# View specific log stream
aws logs get-log-events \
    --log-group-name /ecs/galaxium-travels-backend \
    --log-stream-name ecs/backend/<task-id>
```

### 9.2 ECS Console

1. Navigate to AWS ECS Console
2. Select `galaxium-travels-cluster`
3. View services and tasks
4. Check task logs directly

---

## Step 10: Final Verification

### 10.1 Deployment Checklist

- [ ] Infrastructure deployed successfully
- [ ] Database initialized and seeded
- [ ] Docker images built and pushed to ECR
- [ ] ECS services running (2 tasks each)
- [ ] Health checks passing
- [ ] Application accessible via ALB
- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Database queries work
- [ ] Booking functionality works
- [ ] Logs visible in CloudWatch
- [ ] No errors in logs

### 10.2 Performance Check

```bash
# Test response times
time curl -s http://$ALB_DNS/health > /dev/null
time curl -s http://$ALB_DNS/api/flights > /dev/null

# Load test (optional)
# Install: brew install apache-bench
ab -n 100 -c 10 http://$ALB_DNS/
```

---

## Troubleshooting

### Issue: ECS Tasks Not Starting

```bash
# Check task stopped reason
aws ecs describe-tasks \
    --cluster galaxium-travels-cluster \
    --tasks <task-arn> \
    --region us-east-1

# Common causes:
# - Image pull errors (check ECR permissions)
# - Health check failures (check application logs)
# - Resource constraints (increase CPU/memory)
```

### Issue: Database Connection Failed

```bash
# Verify security group rules
# Ensure ECS security group can access RDS on port 5432

# Test connection from ECS task
aws ecs execute-command \
    --cluster galaxium-travels-cluster \
    --task <task-arn> \
    --container backend \
    --interactive \
    --command "/bin/sh"

# Inside container:
nc -zv <rds-endpoint> 5432
```

### Issue: 502 Bad Gateway

```bash
# Check target group health
aws elbv2 describe-target-health \
    --target-group-arn <target-group-arn>

# Common causes:
# - Health check path incorrect
# - Application not listening on correct port
# - Security group blocking traffic
```

### Issue: Application Not Loading

```bash
# Check ALB listener rules
aws elbv2 describe-listeners \
    --load-balancer-arn <alb-arn>

# Check target group registration
aws elbv2 describe-target-health \
    --target-group-arn <target-group-arn>
```

---

## Rollback Procedure

If deployment fails:

```bash
# Option 1: Rollback ECS services
./scripts/rollback.sh <previous-revision>

# Option 2: Destroy infrastructure
cd terraform
terraform destroy

# Option 3: Rollback specific resources
terraform state list
terraform destroy -target=<resource>
```

---

## Post-Deployment Tasks

1. **Document URLs and Credentials**
   - Save ALB URL
   - Document database endpoint
   - Store ECR repository URLs

2. **Update Team**
   - Share application URL
   - Provide access to AWS console
   - Document deployment process

3. **Set Up Monitoring**
   - Configure CloudWatch alarms
   - Set up log aggregation
   - Enable cost monitoring

4. **Proceed to Phase 5**
   - [Phase 5: Post-Deployment](./phase-5-post-deployment.md)

---

## Deployment Summary

**Resources Created:**
- 1 VPC with 6 subnets across 2 AZs
- 1 Application Load Balancer
- 1 ECS Cluster with 2 services (4 tasks total)
- 1 RDS PostgreSQL instance
- 2 ECR repositories
- Multiple security groups and IAM roles
- CloudWatch log groups

**Estimated Costs:**
- ~$75-125/month for production workload

**Access:**
- Application: `http://<alb-dns-name>`
- API Docs: `http://<alb-dns-name>/docs`
- Database: `<rds-endpoint>:5432`

---

**Estimated Time:** 1 day  
**Difficulty:** Medium  
**Dependencies:** Phases 1-3 complete

**Congratulations!** Your application is now running on AWS! 🎉